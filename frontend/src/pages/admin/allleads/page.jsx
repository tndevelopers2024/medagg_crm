// src/pages/admin/allleads/page.jsx — Thin orchestrator
import React, { useMemo, useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, Button } from "antd";
import { FiBell } from "react-icons/fi";
import { formatPhoneNumber } from "../../../utils/leadHelpers";
import { usePageTitle } from "../../../contexts/TopbarTitleContext";
import { useSocket } from "../../../contexts/SocketProvider";
import { useAuth } from "../../../contexts/AuthContext";
import AccessDenied from "../../../components/AccessDenied";
import PermissionGate from "../../../components/PermissionGate";
import BulkEditSidebar from "../../../components/admin/BulkEditSidebar";
import LeadFilters from "../../../components/admin/leads/LeadFilters";
import LeadActions from "../../../components/admin/leads/LeadActions";
import { COLUMN_DEFINITIONS, buildFieldColumns } from "../../../utils/columnConfig.jsx";
import useColumnVisibility from "../../../hooks/useColumnVisibility";

// Local hooks
import useLeadsData from "./hooks/useLeadsData";
import useLeadSocket from "./hooks/useLeadSocket";
import useLeadFilters from "./hooks/useLeadFilters";
import useLeadSelection from "./hooks/useLeadSelection";
import useBulkOperations from "./hooks/useBulkOperations";
import useFilterTemplates from "./hooks/useFilterTemplates";
import useLeadAnalytics from "./hooks/useLeadAnalytics.jsx";
import useLeadExport from "../../../hooks/useLeadExport";

// Local components
import { useToasts } from "./components/LeadToast";
import LeadsHeader from "./components/LeadsHeader";
import LeadsTable from "./components/LeadsTable";
import LeadsPagination from "./components/LeadsPagination";
import LeadsChartPanel from "./components/LeadsChartPanel";
import LeadsModalsSection from "./components/LeadsModalsSection";

export default function LeadsManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, isCaller, loading: authLoading, hasPermission } = useAuth();
  const { socket, isConnected } = useSocket();
  usePageTitle("Leads Management", "Manage your leads effectively");

  // Page state — owned here so filter changes can reset it
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Toasts (Ant notification)
  const { push, contextHolder } = useToasts();
  const notify = useCallback(
    (title, message, opts = {}) => {
      const withTime = (t) => (t instanceof Date && !isNaN(t) ? t.toLocaleTimeString() : "Just now");
      push({
        title,
        message,
        icon: opts.icon || FiBell,
        tone: opts.tone || "info",
        timeout: opts.timeout ?? 10000,
        leadName: opts.leadName,
        leadDetails: opts.leadDetails && {
          ...opts.leadDetails,
          time: opts.leadDetails.time || withTime(new Date()),
        },
        action: opts.action,
      });
    },
    [push]
  );

  // Determine effective role
  const userRoleName = user?.role && typeof user.role === "object" ? (user.role.name || "").toLowerCase() : String(user?.role || "").toLowerCase();
  const effectiveIsCaller = isCaller || userRoleName === "caller";

  // Ref to hold the latest filterState — useLeadsData reads from this ref
  const filtersRef = React.useRef({});

  // Data hook (called first, reads filters from ref)
  const {
    setRows, leads, callers, callerMap, fieldConfigs, leadStages,
    campaigns, loading, setLoading,
    serverMeta, filterMeta, invalidate, refetchMeta, triggerFetch,
  } = useLeadsData({
    isAdmin, effectiveIsCaller, authLoading, isCaller, user,
    filtersRef, page, pageSize,
  });

  // Filters — uses loaded metadata for building options
  const filters = useLeadFilters({
    leadStages, fieldConfigs, campaigns, callers, filterMeta,
  });

  // Keep ref in sync and trigger re-fetch when filterState changes
  const prevFilterRef = React.useRef(filters.filterState);
  useEffect(() => {
    filtersRef.current = { ...filters.filterState, chartDrillFilters: filtersRef.current?.chartDrillFilters || [] };
    if (prevFilterRef.current !== filters.filterState) {
      prevFilterRef.current = filters.filterState;
      setPage(1);
      triggerFetch();
    }
  }, [filters.filterState, triggerFetch]);

  // Apply filter from dashboard navigation
  useEffect(() => {
    if (location.state?.filter) {
      const { filter } = location.state;
      if (filter.dateMode) filters.setDateMode(filter.dateMode);
      if (filter.leadStatus) filters.setLeadStatus(Array.isArray(filter.leadStatus) ? filter.leadStatus : [filter.leadStatus]);
      if (filter.opdStatus) filters.setOpdStatus(filter.opdStatus);
      if (filter.ipdStatus) filters.setIpdStatus(filter.ipdStatus);
      if (filter.campaignFilter) {
        filters.setCampaignFilter(
          Array.isArray(filter.campaignFilter) ? filter.campaignFilter : [filter.campaignFilter]
        );
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  // Socket
  const { highlight } = useLeadSocket({
    socket, isConnected, setRows, notify, invalidate,
  });

  // Selection & pagination (server-paginated)
  const selection = useLeadSelection(leads, serverMeta);

  // Caller counts from filterMeta
  const callerCounts = useMemo(() => {
    const counts = new Map();
    if (filterMeta?.callerCounts) {
      for (const [callerId, count] of Object.entries(filterMeta.callerCounts)) {
        counts.set(callerId, count);
      }
    }
    return counts;
  }, [filterMeta?.callerCounts]);

  // Bulk operations
  const bulkOps = useBulkOperations({
    selected: selection.selected,
    setSelected: selection.setSelected,
    callers,
    callerCounts,
    notify,
    invalidate,
    refetchMeta,
    setLoading,
    filtersRef,
  });

  // Column visibility (needs to be before templates hook)
  const allColumns = useMemo(() => {
    return [...COLUMN_DEFINITIONS, ...buildFieldColumns(fieldConfigs)];
  }, [fieldConfigs]);

  const columnVis = useColumnVisibility(allColumns);

  // Filter templates
  const templates = useFilterTemplates({
    notify,
    authLoading,
    filterSetters: {
      resetFilterOperators: filters.resetFilterOperators,
      setLeadStatus: filters.setLeadStatus,
      setCallerFilter: filters.setCallerFilter,
      setDateMode: filters.setDateMode,
      setCustomFrom: filters.setCustomFrom,
      setCustomTo: filters.setCustomTo,
      setSource: filters.setSource,
      setFollowupFilter: filters.setFollowupFilter,
      setOpdStatus: filters.setOpdStatus,
      setIpdStatus: filters.setIpdStatus,
      setDiagnostics: filters.setDiagnostics,
      setCampaignFilter: filters.setCampaignFilter,
      setSearch: filters.setSearch,
    },
    columnVisibility: {
      visibleIds: columnVis.visibleIds,
      setVisibleColumns: (colMap) => {
        // Convert object/map to Set of visible column IDs
        const visibleSet = new Set();
        if (colMap && typeof colMap === 'object') {
          Object.entries(colMap).forEach(([key, value]) => {
            if (value === true) visibleSet.add(key);
          });
        }
        // Update visibility by toggling each column
        allColumns.forEach(col => {
          const shouldBeVisible = visibleSet.has(col.id);
          const isCurrentlyVisible = columnVis.visibleIds.has(col.id);
          if (shouldBeVisible !== isCurrentlyVisible && !col.sticky) {
            columnVis.toggle(col.id);
          }
        });
      }
    },
  });


  // Analytics
  const analytics = useLeadAnalytics({
    leadStatus: filters.leadStatus,
    callerFilter: filters.callerFilter,
    source: filters.source,
    opdStatus: filters.opdStatus,
    ipdStatus: filters.ipdStatus,
    diagnostics: filters.diagnostics,
    campaignFilter: filters.campaignFilter,
    dateMode: filters.dateMode,
    customFrom: filters.customFrom,
    customTo: filters.customTo,
    followupFilter: filters.followupFilter,
    customFieldFilters: filters.customFieldFilters,
    filterOperators: filters.filterOperators,
    fieldConfigs,
    notify,
  });

  // Export hook
  const { exportLeads, exporting } = useLeadExport();

  // Export handlers
  const handleExportCurrentPage = async () => {
    const visibleColumnIds = Array.from(visibleIds);
    const result = await exportLeads(
      filters.filterState,
      visibleColumnIds,
      false, // exportAll = false for current page
      page,
      pageSize
    );

    if (result.success) {
      notify("Export Successful", "Current page exported successfully", {
        tone: "success",
        timeout: 3000,
      });
    } else {
      notify("Export Failed", result.error || "Failed to export leads", {
        tone: "error",
        timeout: 5000,
      });
    }
  };

  const handleExportAll = async () => {
    const visibleColumnIds = Array.from(visibleIds);
    const result = await exportLeads(
      filters.filterState,
      visibleColumnIds,
      true // exportAll = true for all filtered results
    );

    if (result.success) {
      notify("Export Successful", "All filtered leads exported successfully", {
        tone: "success",
        timeout: 3000,
      });
    } else {
      notify("Export Failed", result.error || "Failed to export leads", {
        tone: "error",
        timeout: 5000,
      });
    }
  };

  // Sync chart drill filters into filtersRef and trigger list re-fetch
  const prevDrillRef = React.useRef(analytics.chartDrillFilters);
  useEffect(() => {
    filtersRef.current = { ...filtersRef.current, chartDrillFilters: analytics.chartDrillFilters };
    if (prevDrillRef.current !== analytics.chartDrillFilters) {
      prevDrillRef.current = analytics.chartDrillFilters;
      setPage(1);
      triggerFetch();
    }
  }, [analytics.chartDrillFilters, triggerFetch]);

  // Available fields for bulk edit
  const { availableFields, fieldNameMap } = useMemo(() => {
    const fieldsMap = new Map();
    const labelsSet = new Set();
    fieldConfigs.forEach(f => {
      const label = f.displayLabel || f.fieldName;
      labelsSet.add(label);
      fieldsMap.set(label, f.fieldName);
    });
    leads.forEach(l => {
      if (l.raw?.fieldData) {
        l.raw.fieldData.forEach(f => {
          const fieldName = f.name;
          const cfg = fieldConfigs.find(c => c.fieldName === (fieldName || '').toLowerCase());
          const label = cfg ? cfg.displayLabel : fieldName;
          labelsSet.add(label);
          if (!fieldsMap.has(label)) fieldsMap.set(label, fieldName);
        });
      }
    });
    return { availableFields: Array.from(labelsSet).sort(), fieldNameMap: fieldsMap };
  }, [leads, fieldConfigs]);

  // Use column visibility from earlier
  const { visibleIds, toggle: toggleColumn, resetToDefaults, isVisible: isColumnVisible } = columnVis;
  const activeColumns = useMemo(() => {
    return allColumns.filter((col) => {
      if (col.adminOnly && !isAdmin) return false;
      if (col.sticky) return true;
      return visibleIds.has(col.id);
    });
  }, [allColumns, visibleIds, isAdmin]);

  // Pill component for column rendering
  const Pill = ({ text, tone }) => {
    const cls =
      tone === "red"
        ? "bg-red-100 text-red-600 ring-red-200"
        : tone === "blue"
          ? "bg-blue-100 text-blue-700 ring-blue-200"
          : tone === "green"
            ? "bg-green-100 text-green-700 ring-green-200"
            : "bg-gray-100 text-gray-600 ring-gray-200";
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
        {text}
      </span>
    );
  };

  // Column context
  const columnCtx = useMemo(
    () => ({
      callerMap,
      formatPhoneNumber,
      Pill,
      selected: selection.selected,
      toggleOne: selection.toggleOne,
      navigate,
      isAdmin,
      headerCheckboxRef: selection.headerCheckboxRef,
      toggleAllCurrentPage: selection.toggleAllCurrentPage,
      isAllCurrentSelected: selection.isAllCurrentSelected,
      fieldConfigs,
    }),
    [callerMap, selection.selected, isAdmin, selection.isAllCurrentSelected, selection.toggleAllCurrentPage]
  );

  /* ----------------------------- render ----------------------------- */
  if (!hasPermission("leads.all.view") && !hasPermission("leads.assigned.view") && !hasPermission("leads.team.view")) return <AccessDenied />;

  return (
    <div className="min-h-screen pb-20">
      {contextHolder}

      {/* Bulk Edit & Actions (Now enabled for callers as requested for parity) */}
      {(isAdmin || effectiveIsCaller) && (
        <>
          <BulkEditSidebar
            open={bulkOps.showBulkEdit}
            onClose={() => bulkOps.setShowBulkEdit(false)}
            selectedCount={selection.selected.size}
            callers={callers}
            onUpdate={bulkOps.handleBulkUpdate}
            leadStages={filters.leadStatusOptions}
            availableFields={availableFields}
            fieldConfigs={fieldConfigs}
            fieldNameMap={fieldNameMap}
          />
          <BulkEditSidebar
            open={bulkOps.showFilterBulkEdit}
            onClose={() => bulkOps.setShowFilterBulkEdit(false)}
            selectedCount={serverMeta.total}
            callers={callers}
            onUpdate={bulkOps.handleFilterBulkUpdate}
            leadStages={filters.leadStatusOptions}
            availableFields={availableFields}
            fieldConfigs={fieldConfigs}
            fieldNameMap={fieldNameMap}
            mode="filtered"
          />
          <LeadActions
            selectedCount={selection.selected.size}
            onEdit={() => bulkOps.setShowBulkEdit(true)}
            onAssign={() => bulkOps.setShowAssignModal(true)}
            onDelete={bulkOps.handleDelete}
            onClear={() => selection.setSelected(new Set())}
          />
        </>
      )}

      {/* Header */}
      <LeadsHeader
        viewMode={analytics.viewMode}
        setViewMode={analytics.setViewMode}
        filterTemplates={templates.filterTemplates}
        applyTemplate={templates.applyTemplate}
        handleDeleteTemplate={templates.handleDeleteTemplate}
        handleSetDefault={templates.handleSetDefault}
        handleEditTemplate={templates.handleEditTemplate}
        currentTemplateId={templates.currentTemplateId}
        allColumns={allColumns}
        visibleIds={visibleIds}
        toggleColumn={toggleColumn}
        resetToDefaults={resetToDefaults}
        onSaveFilter={() => templates.setShowSaveTemplateModal(true)}
        resetFilters={filters.resetFilters}
        onExportCurrentPage={handleExportCurrentPage}
        onExportAll={handleExportAll}
        onBulkEdit={isAdmin || effectiveIsCaller ? () => bulkOps.setShowFilterBulkEdit(true) : undefined}
      />

      {/* Filters */}
      <section className="mb-6">
        <LeadFilters
          dateMode={filters.dateMode} setDateMode={filters.setDateMode}
          customFrom={filters.customFrom} setCustomFrom={filters.setCustomFrom}
          customTo={filters.customTo} setCustomTo={filters.setCustomTo}
          source={filters.source} setSource={filters.setSource} sourceOptions={filters.sourceOptions}
          caller={filters.callerFilter} setCaller={filters.setCallerFilter} callerOptions={filters.callerOptions}
          status={filters.leadStatus} setStatus={filters.setLeadStatus} statusOptions={filters.leadStatusOptions}
          followup={filters.followupFilter} setFollowup={filters.setFollowupFilter} followupOptions={filters.followupOptions}
          opd={filters.opdStatus} setOpd={filters.setOpdStatus} opdOptions={filters.opdOptions}
          ipd={filters.ipdStatus} setIpd={filters.setIpdStatus} ipdOptions={filters.ipdOptions}
          diag={filters.diagnostics} setDiag={filters.setDiagnostics} diagOptions={filters.diagOptions}
          campaign={filters.campaignFilter} setCampaign={filters.setCampaignFilter} campaignOptions={filters.campaignOptions}
          search={filters.search} setSearch={filters.setSearch}
          fieldConfigs={fieldConfigs}
          customFieldFilters={filters.customFieldFilters}
          onCustomFieldFilter={filters.setCustomFieldFilter}
          onRemoveCustomFieldFilter={filters.removeCustomFieldFilter}
          chartDrillFilters={analytics.chartDrillFilters}
          removeChartDrillFilter={analytics.removeChartDrillFilter}
          updateChartDrillFilter={analytics.updateChartDrillFilter}
          clearAllChartDrillFilters={analytics.clearAllChartDrillFilters}
          analyticsFilterOptions={analytics.analyticsFilterOptions}
          operators={filters.filterOperators}
          onOperatorChange={filters.setFilterOperator}
        />
      </section>

      {/* Chart View */}
      {analytics.viewMode === "chart" && (
        <LeadsChartPanel
          chartType={analytics.chartType}
          setChartType={analytics.setChartType}
          customFieldName={analytics.customFieldName}
          setCustomFieldName={analytics.setCustomFieldName}
          chartData={analytics.chartData}
          chartTotalCount={analytics.chartTotalCount}
          chartLoading={analytics.chartLoading}
          exporting={analytics.exporting}
          chartDrillFilters={analytics.chartDrillFilters}
          analyticsFilterOptions={analytics.analyticsFilterOptions}
          mergedAnalyticsFilters={analytics.mergedAnalyticsFilters}
          loadChartData={analytics.loadChartData}
          handleExportCSV={analytics.handleExportCSV}
          renderChart={analytics.renderChart}
          fieldConfigs={fieldConfigs}
        />
      )}

      {/* Table View */}
      {analytics.viewMode === "list" && (
        <Card bodyStyle={{ padding: 0 }}>
          <LeadsPagination
            page={page}
            setPage={setPage}
            totalPages={serverMeta.totalPages}
            pageSize={pageSize}
            setPageSize={setPageSize}
            filteredCount={serverMeta.total}
            className="border-b border-gray-100 bg-white px-4 py-3 flex items-center justify-between"
          />

          <LeadsTable
            loading={loading}
            filtered={leads}
            currentRows={selection.currentRows}
            activeColumns={activeColumns}
            columnCtx={columnCtx}
            selected={selection.selected}
            highlight={highlight}
            navigate={navigate}
          />

          <LeadsPagination
            page={page}
            setPage={setPage}
            totalPages={serverMeta.totalPages}
            pageSize={pageSize}
            setPageSize={setPageSize}
            filteredCount={serverMeta.total}
            
          />

          {/* Location Assign Button */}
          {/* {(isAdmin || effectiveIsCaller) && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => bulkOps.setShowAssignLocation(true)}
                className="rounded-lg bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
              >
                Assign by Location
              </Button>
            </div>
          )} */}
        </Card>
      )}

      {/* All Modals */}
      <LeadsModalsSection
        showAssignModal={bulkOps.showAssignModal}
        setShowAssignModal={bulkOps.setShowAssignModal}
        callers={callers}
        selectedCount={selection.selected.size}
        handleBulkAssign={bulkOps.handleBulkAssign}
        showLocationAssignModal={bulkOps.showLocationAssignModal}
        setShowLocationAssignModal={bulkOps.setShowLocationAssignModal}
        handleLocationAssign={bulkOps.handleLocationAssign}
        showDeleteModal={bulkOps.showDeleteModal}
        setShowDeleteModal={bulkOps.setShowDeleteModal}
        confirmDelete={bulkOps.confirmDelete}
        isDeleting={bulkOps.isDeleting}
        successOpen={bulkOps.successOpen}
        setSuccessOpen={bulkOps.setSuccessOpen}
        successText={bulkOps.successText}
        showSaveTemplateModal={templates.showSaveTemplateModal}
        setShowSaveTemplateModal={templates.setShowSaveTemplateModal}
        currentFilters={{
          status: filters.leadStatus,
          assignee: filters.callerFilter,
          source: [filters.source],
          followup: [filters.followupFilter],
          opd: [filters.opdStatus],
          ipd: [filters.ipdStatus],
          diagnostic: [filters.diagnostics],
          campaign: filters.campaignFilter,
          dateMode: filters.dateMode,
          dateRange: { start: filters.customFrom || null, end: filters.customTo || null },
          searchQuery: filters.search,
        }}
        handleSaveTemplate={templates.handleSaveTemplate}
        showEditTemplateModal={templates.showEditTemplateModal}
        setShowEditTemplateModal={templates.setShowEditTemplateModal}
        editingTemplate={templates.editingTemplate}
        handleUpdateTemplate={templates.handleUpdateTemplate}
      />

      <style>{`
        @keyframes rowFlash {
          0% { background-color: #f0ecff; }
          100% { background-color: transparent; }
        }
        .animate-rowFlash { animation: rowFlash .8s ease-out 0s 1; }
      `}</style>
    </div>
  );
}
