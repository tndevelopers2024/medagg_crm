import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  fetchAllLeads,
  fetchAssignedLeads,
  getAllUsers,
  fetchLeadFields,
  fetchLeadStages,
  fetchCampaigns,
  fetchLeadFilterMeta,
} from "../../../../utils/api";
import { parseLead } from "../../../../utils/leadHelpers";

/**
 * Build query params object from filter state for the server API.
 */
function buildQueryParams(filters, page, pageSize) {
  const params = { page, limit: pageSize };

  if (filters.dateMode) {
    params.dateMode = filters.dateMode;
  }
  if (filters.dateMode === "Custom") {
    if (filters.customFrom) params.from = filters.customFrom;
    if (filters.customTo) params.to = filters.customTo;
  }
  if (filters.source && filters.source !== "All Sources") {
    params.source = filters.source;
  }
  if (filters.callerFilter && filters.callerFilter !== "All Callers") {
    params.assignedTo = filters.callerFilter === "Unassigned" ? "null" : filters.callerFilter;
  }
  if (filters.leadStatus && filters.leadStatus !== "Lead Status") {
    params.status = filters.leadStatus;
  }
  if (filters.followupFilter && filters.followupFilter !== "All") {
    params.followup = filters.followupFilter;
  }
  if (filters.campaignFilter && filters.campaignFilter !== "All Campaigns") {
    params.campaignId = filters.campaignFilter;
  }
  if (filters.debouncedSearch && filters.debouncedSearch.trim()) {
    params.q = filters.debouncedSearch.trim();
  }
  if (filters.opdStatus && filters.opdStatus !== "OPD Status") {
    params.opdStatus = filters.opdStatus;
  }
  if (filters.ipdStatus && filters.ipdStatus !== "IPD Status") {
    params.ipdStatus = filters.ipdStatus;
  }
  if (filters.diagnostics && filters.diagnostics !== "Diagnostics") {
    params.diagnostics = filters.diagnostics;
  }

  // Custom field filters — sent as field__<fieldName>=<value> and fieldOp__<fieldName>=<operator>
  if (filters.customFieldFilters) {
    for (const [fieldName, { value, operator }] of Object.entries(filters.customFieldFilters)) {
      if (value) {
        params[`field__${fieldName}`] = value;
        if (operator && operator !== 'is') {
          params[`fieldOp__${fieldName}`] = operator;
        }
      }
    }
  }

  // Chart drill-down filters — convert analytics filter format to list query params
  if (Array.isArray(filters.chartDrillFilters)) {
    for (const df of filters.chartDrillFilters) {
      const { type, operator, value, from, to } = df;
      switch (type) {
        case "leadStatus":
          if (!params.status) params.status = value;
          break;
        case "assignee":
          if (!params.assignedTo) params.assignedTo = value === "Unassigned" ? "null" : value;
          break;
        case "source":
          if (!params.source) params.source = value;
          break;
        case "campaign":
          if (!params.campaignId) params.campaignId = value;
          break;
        case "callStatus":
          if (!params.callStatus) params.callStatus = value;
          break;
        case "totalCalls":
          if (from !== undefined) params.callCountFrom = from;
          if (to !== undefined) params.callCountTo = to;
          break;
        default:
          // custom_<fieldName> drill filters
          if (type.startsWith("custom_")) {
            const fieldName = type.replace("custom_", "");
            if (!params[`field__${fieldName}`]) {
              params[`field__${fieldName}`] = value;
              if (operator && operator !== "is") {
                params[`fieldOp__${fieldName}`] = operator;
              }
            }
          }
          break;
      }
    }
  }

  return params;
}

export default function useLeadsData({ isAdmin, effectiveIsCaller, authLoading, isCaller, user, filtersRef, page, pageSize }) {
  const [rows, setRows] = useState([]);
  const [callers, setCallers] = useState([]);
  const [fieldConfigs, setFieldConfigs] = useState([]);
  const [leadStages, setLeadStages] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [filterMeta, setFilterMeta] = useState({ sources: [], statuses: [], callerCounts: {} });
  const [serverMeta, setServerMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [metaLoaded, setMetaLoaded] = useState(false);
  // Counter to trigger re-fetches from outside
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const fetchFn = effectiveIsCaller ? fetchAssignedLeads : fetchAllLeads;

  // Mount effect: load callers, fieldConfigs, leadStages, campaigns, filterMeta (once)
  useEffect(() => {
    let mounted = true;
    if (authLoading) return;

    (async () => {
      try {
        const [users, fieldsRes, stagesRes, campaignsRes, meta] = await Promise.all([
          isAdmin ? getAllUsers({ role: "caller" }) : Promise.resolve([]),
          fetchLeadFields({ active: true }),
          fetchLeadStages({ active: true }),
          fetchCampaigns({ limit: 1000 }),
          isAdmin ? fetchLeadFilterMeta() : Promise.resolve({ sources: [], statuses: [], callerCounts: {} }),
        ]);
        if (!mounted) return;

        setCallers(users.filter((u) => (u.role || "").toLowerCase() === "caller"));
        setFieldConfigs(fieldsRes.data || []);
        setLeadStages(stagesRes.data || []);
        setCampaigns(campaignsRes?.data || []);
        setFilterMeta(meta);
        setMetaLoaded(true);
      } catch (e) {
        console.error('AllLeads - Error loading metadata:', e);
        if (mounted) setMetaLoaded(true); // still allow data fetching
      }
    })();
    return () => { mounted = false; };
  }, [authLoading, isAdmin]);

  // Data effect: fetch leads whenever filters or page changes
  const fetchVersionRef = useRef(0);

  const fetchLeads = useCallback(async () => {
    const version = ++fetchVersionRef.current;
    const currentFilters = filtersRef?.current || {};
    setLoading(true);
    try {
      const params = buildQueryParams(currentFilters, page || 1, pageSize || 20);
      const result = await fetchFn(params);
      if (fetchVersionRef.current !== version) return; // stale
      setRows(result.leads || []);
      setServerMeta({
        page: result.page || 1,
        total: result.total || 0,
        totalPages: result.totalPages || 1,
      });
    } catch (e) {
      console.error('AllLeads - Error fetching leads:', e);
    } finally {
      if (fetchVersionRef.current === version) setLoading(false);
    }
  }, [fetchFn, filtersRef, page, pageSize, fetchTrigger]);

  useEffect(() => {
    if (authLoading || !metaLoaded) return;
    fetchLeads();
  }, [authLoading, metaLoaded, fetchLeads]);

  // Trigger a re-fetch (used when filters change externally)
  const triggerFetch = useCallback(() => {
    setFetchTrigger(v => v + 1);
  }, []);

  // Debounced invalidate for socket events (re-fetch current page after 2s)
  const invalidateTimerRef = useRef(null);
  const invalidate = useCallback(() => {
    if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
    invalidateTimerRef.current = setTimeout(() => {
      fetchLeads();
    }, 2000);
  }, [fetchLeads]);

  const refetchMeta = useCallback(async () => {
    try {
      const meta = await fetchLeadFilterMeta();
      setFilterMeta(meta);
    } catch (e) {
      console.error('Failed to refetch filter meta:', e);
    }
  }, []);

  const campaignMap = useMemo(() => {
    const m = new Map();
    campaigns.forEach((c) => {
      m.set(c.id, c.name);
      if (c._id) m.set(c._id, c.name);
      if (c.integration?.externalId) m.set(c.integration.externalId, c.name);
      if (c.integration?.metaCampaignId) m.set(c.integration.metaCampaignId, c.name);
    });
    return m;
  }, [campaigns]);

  const reverseCampaignMap = useMemo(() => {
    const m = new Map();
    campaigns.forEach((c) => {
      const mongoId = c._id;
      if (c.id) m.set(c.id, mongoId);
      if (c._id) m.set(c._id, mongoId);
      if (c.integration?.externalId) m.set(c.integration.externalId, mongoId);
      if (c.integration?.metaCampaignId) m.set(c.integration.metaCampaignId, mongoId);
    });
    return m;
  }, [campaigns]);

  const leads = useMemo(() => rows.map((r) => parseLead(r, campaignMap)), [rows, campaignMap]);

  const callerMap = useMemo(() => {
    const m = new Map();
    callers.forEach((c) => m.set(c.id, c));
    return m;
  }, [callers]);

  return {
    rows,
    setRows,
    leads,
    callers,
    callerMap,
    fieldConfigs,
    leadStages,
    campaigns,
    campaignMap,
    reverseCampaignMap,
    loading,
    setLoading,
    fetchFn,
    serverMeta,
    filterMeta,
    invalidate,
    refetchMeta,
    triggerFetch,
  };
}
