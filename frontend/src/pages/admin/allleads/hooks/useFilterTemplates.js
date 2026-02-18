import { useEffect, useState } from "react";
import {
  fetchFilterTemplates,
  createFilterTemplate,
  updateFilterTemplate,
  deleteFilterTemplate,
  setDefaultTemplate,
  applyFilterTemplate,
} from "../../../../utils/filterTemplateApi";

export default function useFilterTemplates({ notify, authLoading, filterSetters, columnVisibility }) {
  const [filterTemplates, setFilterTemplates] = useState([]);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [currentTemplateId, setCurrentTemplateId] = useState(null);

  const loadFilterTemplates = async () => {
    try {
      const response = await fetchFilterTemplates();
      setFilterTemplates(response.data || []);

      const defaultTemplate = response.data?.find(t => t.isDefault);
      if (defaultTemplate && !currentTemplateId) {
        applyTemplateLocal(defaultTemplate);
      }
    } catch (error) {
      console.error('Error loading filter templates:', error);
      if (error?.response?.status !== 404) {
        notify('Error', 'Failed to load saved filters', { tone: 'error' });
      }
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadFilterTemplates();
    }
  }, [authLoading]);

  const applyTemplateLocal = async (template) => {
    try {
      const s = filterSetters;
      // Reset operators to default 'is' since templates don't store operators
      if (s.resetFilterOperators) s.resetFilterOperators();
      s.setLeadStatus(Array.isArray(template.filters.status) ? template.filters.status : []);
      s.setCallerFilter(Array.isArray(template.filters.assignee) ? template.filters.assignee : []);
      s.setDateMode(template.filters.dateMode || '7d');
      if (template.filters.dateRange?.start) {
        s.setCustomFrom(new Date(template.filters.dateRange.start).toISOString().split('T')[0]);
      }
      if (template.filters.dateRange?.end) {
        s.setCustomTo(new Date(template.filters.dateRange.end).toISOString().split('T')[0]);
      }
      s.setSource(template.filters.source?.[0] || 'All Sources');
      s.setFollowupFilter(template.filters.followup?.[0] || 'All');
      s.setOpdStatus(template.filters.opd?.[0] || 'OPD Status');
      s.setIpdStatus(template.filters.ipd?.[0] || 'IPD Status');
      s.setDiagnostics(template.filters.diagnostic?.[0] || 'Diagnostics');
      s.setCampaignFilter(Array.isArray(template.filters.campaign) ? template.filters.campaign : []);
      s.setSearch(template.filters.searchQuery || '');

      // Restore column visibility if available
      if (template.columnVisibility && columnVisibility?.setVisibleColumns) {
        const colVisMap = template.columnVisibility;
        if (colVisMap && typeof colVisMap === 'object') {
          columnVisibility.setVisibleColumns(colVisMap);
        }
      }

      setCurrentTemplateId(template._id);
      await applyFilterTemplate(template._id);
      notify('Filter Applied', `Template "${template.name}" applied successfully`, { tone: 'success' });
    } catch (error) {
      console.error('Error applying template:', error);
      notify('Error', 'Failed to apply filter template', { tone: 'error' });
    }
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      // Add current column visibility to template data
      const dataWithColumns = {
        ...templateData,
        columnVisibility: columnVisibility?.visibleIds
          ? Object.fromEntries(
            Array.from(columnVisibility.visibleIds).map(id => [id, true])
          )
          : {}
      };

      await createFilterTemplate(dataWithColumns);
      await loadFilterTemplates();
      notify('Template Saved', `Filter template "${templateData.name}" saved successfully`, { tone: 'success' });
    } catch (error) {
      console.error('Error saving template:', error);
      notify('Error', 'Failed to save filter template', { tone: 'error' });
    }
  };

  const handleUpdateTemplate = async (id, templateData) => {
    try {
      // Add current column visibility to template data
      const dataWithColumns = {
        ...templateData,
        columnVisibility: columnVisibility?.visibleIds
          ? Object.fromEntries(
            Array.from(columnVisibility.visibleIds).map(id => [id, true])
          )
          : {}
      };

      await updateFilterTemplate(id, dataWithColumns);
      await loadFilterTemplates();
      setShowEditTemplateModal(false);
      setEditingTemplate(null);
      notify('Template Updated', `Filter template "${templateData.name}" updated successfully`, { tone: 'success' });
    } catch (error) {
      console.error('Error updating template:', error);
      notify('Error', 'Failed to update filter template', { tone: 'error' });
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Delete this filter template?')) return;
    try {
      await deleteFilterTemplate(id);
      await loadFilterTemplates();
      if (currentTemplateId === id) {
        setCurrentTemplateId(null);
      }
      notify('Template Deleted', 'Filter template deleted successfully', { tone: 'success' });
    } catch (error) {
      console.error('Error deleting template:', error);
      notify('Error', 'Failed to delete filter template', { tone: 'error' });
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultTemplate(id);
      await loadFilterTemplates();
      notify('Default Set', 'Default filter template updated', { tone: 'success' });
    } catch (error) {
      console.error('Error setting default:', error);
      notify('Error', 'Failed to set default template', { tone: 'error' });
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowEditTemplateModal(true);
  };

  return {
    filterTemplates,
    showSaveTemplateModal,
    setShowSaveTemplateModal,
    showEditTemplateModal,
    setShowEditTemplateModal,
    editingTemplate,
    currentTemplateId,
    applyTemplate: applyTemplateLocal,
    handleSaveTemplate,
    handleUpdateTemplate,
    handleEditTemplate,
    handleDeleteTemplate,
    handleSetDefault,
  };
}
