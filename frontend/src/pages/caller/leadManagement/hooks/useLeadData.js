import { useEffect, useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchLeadDetail,
  updateLeadField,
} from "../../../../utils/api";
import { useLeadFields, useLeadStages, useCampaigns, useUsers } from "../../../../hooks/queries/useConfigQueries";
import { queryKeys } from "../../../../hooks/queries/queryKeys";
import { useAuth } from "../../../../contexts/AuthContext";
import toast from "react-hot-toast";
import { fieldDataToObject } from "../../../../components/DynamicField";

export default function useLeadData(id, loadActivities) {
  useAuth(); // ensure auth context is available
  const queryClient = useQueryClient();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leadData, setLeadData] = useState({});
  const [documents, setDocuments] = useState([]);

  // Dynamic field configurations via React Query (shared 5min cache)
  const { data: leadFields = [], isLoading: fieldsLoading } = useLeadFields({ active: "true" });
  const { data: leadStages = [] } = useLeadStages({ active: "true" });
  const { data: campaigns = [] } = useCampaigns({ limit: 1000 });
  const { data: callers = [] } = useUsers({});

  // Internal mutable state for leadFields (needed for add-option)
  const [localLeadFields, setLocalLeadFields] = useState([]);
  useEffect(() => {
    if (leadFields.length > 0) setLocalLeadFields(leadFields);
  }, [leadFields]);

  // Status
  const [status, setStatus] = useState("new");
  const [initialStatus, setInitialStatus] = useState(null);
  const [newBookingAdded, setNewBookingAdded] = useState(false);
  const [notes, setNotes] = useState("");
  const [opdBooked, setOpdBooked] = useState(false);

  // Bookings
  const [opBookings, setOpBookings] = useState([]);
  const [ipBookings, setIpBookings] = useState([]);
  const [diagnosticBookings, setDiagnosticBookings] = useState([]);

  const hasStatusChanged = useMemo(
    () => initialStatus !== null && status !== initialStatus,
    [status, initialStatus]
  );

  const campaignMap = useMemo(() => {
    const m = new Map();
    campaigns.forEach((c) => {
      m.set(c.id, c.name);
      if (c._id) m.set(c._id, c.name);
      if (c.integration?.externalId) m.set(c.integration.externalId, c.name);
      if (c.integration?.metaCampaignId)
        m.set(c.integration.metaCampaignId, c.name);
    });
    return m;
  }, [campaigns]);

  const statusOptions = useMemo(() => {
    const grouped = { initial: [], active: [], won: [], lost: [] };
    leadStages.forEach((stage) => {
      if (grouped[stage.stageCategory]) {
        grouped[stage.stageCategory].push({
          value: stage.stageName,
          label: stage.displayLabel,
          color: stage.color,
          category: stage.stageCategory,
        });
      }
    });
    return grouped;
  }, [leadStages]);

  const currentCampaign = useMemo(() => {
    if (!lead || !lead.campaignId) return null;

    const found = campaigns.find(
      (c) =>
        c.id === lead.campaignId ||
        c._id === lead.campaignId ||
        c.integration?.externalId === lead.campaignId ||
        c.integration?.metaCampaignId === lead.campaignId
    );

    return found;
  }, [lead, campaigns]);

  const combinedFields = useMemo(() => {
    const fields = localLeadFields.length > 0 ? localLeadFields : leadFields;
    if (!lead || !lead.fieldData) return fields;

    const existingKeys = new Set(
      fields.map((f) => (f.fieldName || "").toLowerCase())
    );
    const ignored = new Set([
      "source",
      "lead_status",
      "status",
      "rating",
      "opd_booked",
      "opd_status",
      "ipd_status",
      "diagnostic",
    ]);

    const extras = [];
    lead.fieldData.forEach((f) => {
      const name = (f.name || "").toLowerCase();
      if (!name) return;
      if (existingKeys.has(name)) return;
      if (ignored.has(name)) return;
      extras.push({
        _id: `virt_${name}`,
        fieldName: name,
        displayLabel: f.name
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        fieldType: "text",
        isRequired: false,
        placeholder: f.values?.[0] || "",
        isVirtual: true,
      });
    });

    return [...fields, ...extras].map(f => ({
      ...f,
      fieldType: (f.fieldType || "text").toLowerCase()
    }));
  }, [localLeadFields, leadFields, lead]);

  // Auto-populate source from campaign name
  useEffect(() => {
    if (!lead) return;
    const mapped = lead.campaignName || (lead.campaignId ? `Campaign ${lead.campaignId}` : "Unknown Campaign");
    setLeadData((prev) => {
      if (prev.source === mapped) return prev;
      return { ...prev, source: mapped };
    });
  }, [lead]);

  const loadLeadData = useCallback(async () => {
    try {
      setLoading(true);
      const detail = await fetchLeadDetail(id);

      // Also seed into React Query cache for other consumers
      queryClient.setQueryData(queryKeys.leadDetail(id), detail);

      setLead(detail);
      setDocuments(detail.documents || []);
      setOpBookings(detail.opBookings || []);
      setIpBookings(detail.ipBookings || []);
      setDiagnosticBookings(detail.diagnosticBookings || []);

      const fieldDataObj = fieldDataToObject(detail.fieldData || []);
      setLeadData(fieldDataObj);

      setStatus(detail?.status || "new");
      setInitialStatus(detail?.status || "new");
      setNotes(detail?.notes || "");
      setOpdBooked(
        ["yes", "true", "booked"].includes(
          (fieldDataObj.opd_booked || "").toLowerCase()
        )
      );

      await loadActivities();
    } catch (e) {
      console.error("fetchLeadDetail error:", e);
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [id, loadActivities, queryClient]);

  useEffect(() => {
    loadLeadData();
  }, [loadLeadData]);

  const handleLeadFieldChange = (fieldName, value) => {
    setLeadData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleAddLeadOption = async (field, newValue) => {
    try {
      if (!field._id || field._id.startsWith('virt_')) return;

      const updatedOptions = [...(field.options || []), newValue];
      const res = await updateLeadField(field._id, { options: updatedOptions });

      if (res.success) {
        setLocalLeadFields(prev => prev.map(f => f._id === field._id ? { ...f, options: updatedOptions } : f));
        // Also invalidate the shared cache so other pages pick up the new option
        queryClient.invalidateQueries({ queryKey: ["leadFields"] });
        handleLeadFieldChange(field.fieldName, newValue);
        toast.success(`Option "${newValue}" added and selected`);
      }
    } catch (err) {
      console.error("Error adding lead option:", err);
      toast.error("Failed to add option");
    }
  };

  // Extract assignedTo - handle both populated object and ID string
  const assignedToId = typeof lead?.assignedTo === 'object' && lead?.assignedTo?._id
    ? lead.assignedTo._id
    : lead?.assignedTo || null;

  const assignedCallerName = typeof lead?.assignedTo === 'object' && lead?.assignedTo?.name
    ? lead.assignedTo.name
    : (assignedToId ? "Unknown" : "Unassigned");

  return {
    lead,
    setLead,
    loading,
    leadData,
    setLeadData,
    documents,
    setDocuments,
    leadFields: localLeadFields.length > 0 ? localLeadFields : leadFields,
    leadStages,
    campaigns,
    callers,
    fieldsLoading,
    campaignMap,
    statusOptions,
    currentCampaign,
    combinedFields,
    opBookings,
    setOpBookings,
    ipBookings,
    setIpBookings,
    diagnosticBookings,
    setDiagnosticBookings,
    status,
    setStatus,
    initialStatus,
    hasStatusChanged,
    newBookingAdded,
    setNewBookingAdded,
    notes,
    setNotes,
    opdBooked,
    setOpdBooked,
    assignedTo: assignedToId,
    assignedCallerName,
    loadLeadData,
    handleLeadFieldChange,
    onAddLeadOption: handleAddLeadOption,
  };
}
