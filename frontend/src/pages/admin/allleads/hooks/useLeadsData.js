import { useMemo, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLeadFields, useLeadStages, useCampaigns, useUsers } from "../../../../hooks/queries/useConfigQueries";
import { useLeadList, useFilterMeta } from "../../../../hooks/queries/useLeadListQueries";
import { queryKeys } from "../../../../hooks/queries/queryKeys";
import { parseLead } from "../../../../utils/leadHelpers";

/**
 * Build query params object from filter state for the server API.
 */
export function buildQueryParams(filters, page, pageSize) {
  const params = { page, limit: pageSize };
  const ops = filters.filterOperators || {};

  const dateOp = ops.date;
  if (dateOp === 'after') {
    params.dateMode = 'After';
    if (filters.customFrom) params.from = filters.customFrom;
  } else if (dateOp === 'before') {
    params.dateMode = 'Before';
    if (filters.customTo) params.to = filters.customTo;
  } else if (filters.dateMode) {
    params.dateMode = filters.dateMode;
    if (filters.dateMode === "Custom") {
      if (filters.customFrom) params.from = filters.customFrom;
      if (filters.customTo) params.to = filters.customTo;
    }
  }
  if (ops.source !== 'is_include' && filters.source && filters.source !== "All Sources") {
    params.source = filters.source;
  }
  if (filters.callerFilter && filters.callerFilter.length > 0) {
    params.assignedTo = filters.callerFilter.join(',');
  }
  if (ops.status !== 'is_include' && ops.status !== 'between' && filters.leadStatus && filters.leadStatus.length > 0) {
    params.status = filters.leadStatus.join(',');
  }
  const followupOp = ops.followup;
  if (followupOp === 'is_empty') {
    params.followupOp = 'is_empty';
  } else if (followupOp === 'after') {
    params.followupOp = 'after';
    if (filters.followupFrom) params.followupFrom = filters.followupFrom;
  } else if (followupOp === 'before') {
    params.followupOp = 'before';
    if (filters.followupTo) params.followupTo = filters.followupTo;
  } else if (filters.followupFilter && filters.followupFilter !== "All") {
    params.followup = filters.followupFilter;
    if (filters.followupFilter === "Custom") {
      if (filters.followupFrom) params.followupFrom = filters.followupFrom;
      if (filters.followupTo) params.followupTo = filters.followupTo;
    }
  }
  if (filters.campaignFilter && filters.campaignFilter.length > 0) {
    params.campaignId = filters.campaignFilter.join(',');
  }
  if (filters.batch) {
    params.batch = filters.batch;
  }
  if (filters.debouncedSearch && filters.debouncedSearch.trim()) {
    params.q = filters.debouncedSearch.trim();
  }
  if (ops.opd !== 'is_include' && filters.opdStatus && filters.opdStatus !== "OPD Status") {
    params.opdStatus = filters.opdStatus;
  }
  if (ops.ipd !== 'is_include' && filters.ipdStatus && filters.ipdStatus !== "IPD Status") {
    params.ipdStatus = filters.ipdStatus;
  }
  if (ops.diag !== 'is_include' && filters.diagnostics && filters.diagnostics !== "Diagnostics") {
    params.diagnostics = filters.diagnostics;
  }
  if (filters.opdDate) {
    params.opdDate = filters.opdDate;
    if (ops.opdDate && ops.opdDate !== 'is') {
      params.opdDateOp = ops.opdDate;
      if (ops.opdDate === 'custom' && filters.opdDateTo) params.opdDateTo = filters.opdDateTo;
    }
  }
  if (filters.ipdDate) {
    params.ipdDate = filters.ipdDate;
    if (ops.ipdDate && ops.ipdDate !== 'is') {
      params.ipdDateOp = ops.ipdDate;
      if (ops.ipdDate === 'custom' && filters.ipdDateTo) params.ipdDateTo = filters.ipdDateTo;
    }
  }

  // Standard filter operators — send *Op params (ops and inc declared above)
  const inc = filters.filterIncludeTexts || {};

  if (ops.status === 'is_empty') { params.statusOp = 'is_empty'; }
  else if (ops.status === 'is_include' && inc.status) { params.status = inc.status; params.statusOp = 'is_include'; }
  else if (ops.status === 'is_not' && params.status) { params.statusOp = 'is_not'; }
  else if (ops.status === 'between') {
    params.statusOp = 'between';
    if (filters.statusFrom) params.statusFrom = filters.statusFrom;
    if (filters.statusTo) params.statusTo = filters.statusTo;
  }

  if (ops.source === 'is_empty') { params.sourceOp = 'is_empty'; }
  else if (ops.source === 'is_include' && inc.source) { params.source = inc.source; params.sourceOp = 'is_include'; }
  else if (ops.source === 'is_not' && params.source) { params.sourceOp = 'is_not'; }

  if (ops.caller === 'is_empty') { params.assignedToOp = 'is_empty'; }
  else if (ops.caller === 'is_not' && params.assignedTo) { params.assignedToOp = 'is_not'; }

  if (ops.campaign === 'is_empty') { params.campaignOp = 'is_empty'; }
  else if (ops.campaign === 'is_not' && params.campaignId) { params.campaignOp = 'is_not'; }

  if (!['after', 'before'].includes(ops.followup)) {
    if (ops.followup === 'is_empty') { params.followupOp = 'is_empty'; }
    else if (ops.followup === 'is_not' && params.followup) { params.followupOp = 'is_not'; }
  }

  if (ops.opd === 'is_empty') { params.opdStatusOp = 'is_empty'; }
  else if (ops.opd === 'is_include' && inc.opd) { params.opdStatus = inc.opd; params.opdStatusOp = 'is_include'; }
  else if (ops.opd === 'is_not' && params.opdStatus) { params.opdStatusOp = 'is_not'; }

  if (ops.ipd === 'is_empty') { params.ipdStatusOp = 'is_empty'; }
  else if (ops.ipd === 'is_include' && inc.ipd) { params.ipdStatus = inc.ipd; params.ipdStatusOp = 'is_include'; }
  else if (ops.ipd === 'is_not' && params.ipdStatus) { params.ipdStatusOp = 'is_not'; }

  if (ops.diag === 'is_empty') { params.diagnosticsOp = 'is_empty'; }
  else if (ops.diag === 'is_include' && inc.diag) { params.diagnostics = inc.diag; params.diagnosticsOp = 'is_include'; }
  else if (ops.diag === 'is_not' && params.diagnostics) { params.diagnosticsOp = 'is_not'; }

  if (filters.diagBookingStatus) params.diagBook = filters.diagBookingStatus;
  if (filters.diagDate) {
    params.diagDate = filters.diagDate;
    const diagOp = ops.diagDate;
    if (diagOp && diagOp !== 'is') {
      params.diagDateOp = diagOp;
      if (diagOp === 'custom' && filters.diagDateTo) params.diagDateTo = filters.diagDateTo;
    }
  }
  if (filters.hasSurgery) params.hasSurgery = filters.hasSurgery;
  if (filters.diagCaseType) params.diagCaseType = filters.diagCaseType;

  // Custom field filters — sent as field__<fieldName>=<value> and fieldOp__<fieldName>=<operator>
  if (filters.customFieldFilters) {
    for (const [fieldName, { value, operator }] of Object.entries(filters.customFieldFilters)) {
      if (value || operator === 'is_empty') {
        params[`field__${fieldName}`] = operator === 'is_empty' ? '__is_empty__' : value;
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
        case "custom_lost_reason":
          // Lost reason is the lead status — filter by status
          if (!params.status) params.status = value;
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
  const queryClient = useQueryClient();

  // Config queries (5min stale, shared across pages)
  const { data: callers = [] } = useUsers({}, { enabled: !authLoading && (isAdmin || effectiveIsCaller) });
  const { data: fieldConfigs = [] } = useLeadFields({ active: true }, { enabled: !authLoading });
  const { data: leadStages = [] } = useLeadStages({ active: true }, { enabled: !authLoading });
  const { data: campaigns = [] } = useCampaigns({ limit: 1000 }, { enabled: !authLoading });
  const { data: filterMeta = { sources: [], statuses: [], callerCounts: {} } } = useFilterMeta({
    enabled: !authLoading && (isAdmin || effectiveIsCaller),
  });

  // Build query params from current filters
  const currentFilters = filtersRef?.current || {};
  const queryParams = buildQueryParams(currentFilters, page || 1, pageSize || 20);

  // Lead list query (30s stale, keepPreviousData)
  const {
    data: leadResult,
    isLoading: leadsLoading,
    isFetching,
  } = useLeadList(queryParams, {
    enabled: !authLoading,
  });

  const rows = leadResult?.leads || [];
  const serverMeta = {
    page: leadResult?.page || 1,
    total: leadResult?.total || 0,
    totalPages: leadResult?.totalPages || 1,
  };

  // loading is true only on initial load or hard loading, not background refetches
  const loading = leadsLoading;

  // Debounced invalidate for socket events (re-fetch current page after 2s)
  const invalidateTimerRef = useRef(null);
  const invalidate = useCallback(() => {
    if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
    invalidateTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["leadList"] });
    }, 2000);
  }, [queryClient]);

  // Trigger a re-fetch (used when filters change externally)
  const triggerFetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["leadList"] });
  }, [queryClient]);

  const refetchMeta = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.filterMeta() });
  }, [queryClient]);

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

  // setRows shim — for socket upserts that need to patch rows in-place
  // We use queryClient.setQueryData to update the cached lead list directly
  const setRows = useCallback((updater) => {
    // Find the currently active leadList query and update it
    queryClient.setQueriesData({ queryKey: ["leadList"] }, (old) => {
      if (!old) return old;
      const newLeads = typeof updater === "function" ? updater(old.leads || []) : updater;
      return { ...old, leads: newLeads };
    });
  }, [queryClient]);

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
    setLoading: () => { }, // no-op, React Query manages loading
    fetchFn: effectiveIsCaller ? "assigned" : "all",
    serverMeta,
    filterMeta,
    invalidate,
    refetchMeta,
    triggerFetch,
  };
}
