import { useEffect, useMemo, useState, useCallback } from "react";
import {
  fetchLeadDetail,
  fetchLeadFields,
  fetchBookingFields,
  fetchLeadStages,
  fetchCampaigns,
  getAllUsers,
} from "../../../../utils/api";
import { fieldDataToObject } from "../../../../components/DynamicField";

export default function useLeadData(id, loadActivities) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leadData, setLeadData] = useState({});
  const [documents, setDocuments] = useState([]);

  // Dynamic field configurations
  const [leadFields, setLeadFields] = useState([]);
  const [opFields, setOpFields] = useState([]);
  const [ipFields, setIpFields] = useState([]);
  const [leadStages, setLeadStages] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [callers, setCallers] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);

  // Status
  const [status, setStatus] = useState("new");
  const [initialStatus, setInitialStatus] = useState(null);
  const [newBookingAdded, setNewBookingAdded] = useState(false);
  const [notes, setNotes] = useState("");
  const [opdBooked, setOpdBooked] = useState(false);

  // Bookings
  const [opBookings, setOpBookings] = useState([]);
  const [ipBookings, setIpBookings] = useState([]);

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
    if (!lead || !lead.fieldData) return leadFields;

    const existingKeys = new Set(
      leadFields.map((f) => (f.fieldName || "").toLowerCase())
    );
    const ignored = new Set([
      "source",
      "lead_status",
      "status",
      "rating",
      "opd_booked",
      "campaign_id",
      "ad_id",
      "adset_id",
      "form_id",
      "platform",
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
        fieldName: f.name,
        displayLabel: f.name
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        fieldType: "text",
        isRequired: false,
        placeholder: f.values?.[0] || "",
        isVirtual: true,
      });
    });

    return [...leadFields, ...extras];
  }, [leadFields, lead]);

  // Auto-populate source from campaign name
  useEffect(() => {
    if (!lead || !campaignMap.size) return;
    const cid = lead.campaignId;
    if (cid) {
      const mapped = campaignMap.get(cid) || `Campaign ${cid}`;
      setLeadData((prev) => {
        if (prev.source === mapped) return prev;
        return { ...prev, source: mapped };
      });
    }
  }, [lead, campaignMap]);

  // Load field configurations
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        setFieldsLoading(true);
        const [leadRes, opRes, ipRes, stagesRes, campaignsRes, callersRes] =
          await Promise.all([
            fetchLeadFields({ active: "true" }),
            fetchBookingFields({ type: "OP", active: "true" }),
            fetchBookingFields({ type: "IP", active: "true" }),
            fetchLeadStages({ active: "true" }),
            fetchCampaigns({ limit: 1000 }), // Fetch all campaigns without pagination
            getAllUsers({ role: "caller" }),
          ]);
        if (leadRes.success) setLeadFields(leadRes.data);
        if (opRes.success) setOpFields(opRes.data);
        if (ipRes.success) setIpFields(ipRes.data);
        if (stagesRes.success) setLeadStages(stagesRes.data);
        setCampaigns(campaignsRes?.data || []);
        setCallers(callersRes || []);
      } catch (err) {
        console.error("Error loading field configs:", err);
      } finally {
        setFieldsLoading(false);
      }
    };
    loadConfigs();
  }, []);

  const loadLeadData = useCallback(async () => {
    try {
      setLoading(true);
      const detail = await fetchLeadDetail(id);

      setLead(detail);
      setDocuments(detail.documents || []);
      setOpBookings(detail.opBookings || []);
      setIpBookings(detail.ipBookings || []);

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
  }, [id, loadActivities]);

  useEffect(() => {
    loadLeadData();
  }, [loadLeadData]);

  const handleLeadFieldChange = (fieldName, value) => {
    setLeadData((prev) => ({ ...prev, [fieldName]: value }));
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
    leadFields,
    opFields,
    ipFields,
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
  };
}
