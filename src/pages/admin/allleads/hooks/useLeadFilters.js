import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Default values — when a filter equals its default, it's omitted from the URL
const DEFAULTS = {
  date: "",
  from: "",
  to: "",
  source: "All Sources",
  caller: "All Callers",
  status: "Lead Status",
  followup: "All",
  opd: "OPD Status",
  ipd: "IPD Status",
  diag: "Diagnostics",
  campaign: "All Campaigns",
  search: "",
};

// Resolve legacy `view` param and special `date` values into concrete filter state
function resolveInitialParams(searchParams) {
  const raw = {};
  for (const key of Object.keys(DEFAULTS)) {
    const val = searchParams.get(key);
    if (val) raw[key] = val;
  }

  // Legacy view param support
  const urlView = searchParams.get("view");
  if (urlView === "tasks_today") {
    raw.date = raw.date || "Today";
  } else if (urlView === "tasks_tomorrow") {
    raw.date = raw.date || "Tomorrow";
    raw.followup = raw.followup || "Scheduled";
  } else if (urlView === "call_later") {
    raw.followup = raw.followup || "Scheduled";
  }

  // Legacy: date=today / date=tasks_today / date=tasks_tomorrow
  if (raw.date === "today" || raw.date === "tasks_today") {
    raw.date = "Today";
  } else if (raw.date === "tasks_tomorrow") {
    raw.date = "Tomorrow";
    raw.followup = raw.followup || "Scheduled";
  }

  if (raw.status === "call_later") {
    raw.followup = raw.followup || "Scheduled";
    delete raw.status;
  }

  return raw;
}

export default function useLeadFilters({ leadStages, fieldConfigs, campaigns, callers, filterMeta }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParams = useRef(resolveInitialParams(searchParams)).current;

  // filter state — initialize from URL params, falling back to defaults
  const [dateMode, setDateMode] = useState(initialParams.date || DEFAULTS.date);
  const [customFrom, setCustomFrom] = useState(initialParams.from || DEFAULTS.from);
  const [customTo, setCustomTo] = useState(initialParams.to || DEFAULTS.to);
  const [source, setSource] = useState(initialParams.source || DEFAULTS.source);
  const [callerFilter, setCallerFilter] = useState(initialParams.caller || DEFAULTS.caller);
  const [leadStatus, setLeadStatus] = useState(initialParams.status || DEFAULTS.status);
  const [followupFilter, setFollowupFilter] = useState(initialParams.followup || DEFAULTS.followup);
  const [opdStatus, setOpdStatus] = useState(initialParams.opd || DEFAULTS.opd);
  const [ipdStatus, setIpdStatus] = useState(initialParams.ipd || DEFAULTS.ipd);
  const [diagnostics, setDiagnostics] = useState(initialParams.diag || DEFAULTS.diag);
  const [campaignFilter, setCampaignFilter] = useState(initialParams.campaign || DEFAULTS.campaign);
  const [search, setSearch] = useState(initialParams.search || DEFAULTS.search);

  // Custom field filters — { fieldName: { value, operator } }
  const [customFieldFilters, setCustomFieldFilters] = useState({});

  const setCustomFieldFilter = useCallback((fieldName, value, operator = 'is') => {
    setCustomFieldFilters(prev => ({ ...prev, [fieldName]: { value, operator } }));
  }, []);

  const removeCustomFieldFilter = useCallback((fieldName) => {
    setCustomFieldFilters(prev => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  // Debounced search — updates after 400ms of no typing
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  // Sync filter state → URL (replace to avoid polluting history)
  useEffect(() => {
    const params = {};
    if (dateMode !== DEFAULTS.date) params.date = dateMode;
    if (customFrom !== DEFAULTS.from) params.from = customFrom;
    if (customTo !== DEFAULTS.to) params.to = customTo;
    if (source !== DEFAULTS.source) params.source = source;
    if (callerFilter !== DEFAULTS.caller) params.caller = callerFilter;
    if (leadStatus !== DEFAULTS.status) params.status = leadStatus;
    if (followupFilter !== DEFAULTS.followup) params.followup = followupFilter;
    if (opdStatus !== DEFAULTS.opd) params.opd = opdStatus;
    if (ipdStatus !== DEFAULTS.ipd) params.ipd = ipdStatus;
    if (diagnostics !== DEFAULTS.diag) params.diag = diagnostics;
    if (campaignFilter !== DEFAULTS.campaign) params.campaign = campaignFilter;
    if (search !== DEFAULTS.search) params.search = search;

    setSearchParams(params, { replace: true });
  }, [
    dateMode, customFrom, customTo, source, callerFilter, leadStatus,
    followupFilter, opdStatus, ipdStatus, diagnostics, campaignFilter, search,
    setSearchParams,
  ]);

  // Stable filterState object for the data hook (only changes when actual filter values change)
  const filterState = useMemo(() => ({
    dateMode,
    customFrom,
    customTo,
    source,
    callerFilter,
    leadStatus,
    followupFilter,
    opdStatus,
    ipdStatus,
    diagnostics,
    campaignFilter,
    debouncedSearch,
    customFieldFilters,
  }), [
    dateMode, customFrom, customTo, source, callerFilter, leadStatus,
    followupFilter, opdStatus, ipdStatus, diagnostics, campaignFilter, debouncedSearch,
    customFieldFilters,
  ]);

  // Options derived from filterMeta and configs (not from scanning all leads)
  const sourceOptions = useMemo(
    () => ["All Sources", ...(filterMeta?.sources || [])],
    [filterMeta?.sources]
  );

  const leadStatusOptions = useMemo(() => {
    if (leadStages && leadStages.length > 0) {
      return ["Lead Status", ...leadStages.map(stage => stage.stageName)];
    }
    const statusField = fieldConfigs.find(f => f.fieldName === 'lead_status' || f.fieldName === 'status');
    if (statusField && statusField.options && statusField.options.length > 0) {
      return ["Lead Status", ...statusField.options];
    }
    // Fallback to filterMeta statuses
    return ["Lead Status", ...(filterMeta?.statuses || [])];
  }, [fieldConfigs, leadStages, filterMeta?.statuses]);

  const opdOptions = useMemo(() => {
    const opdField = fieldConfigs.find(f => {
      const fn = (f.fieldName || '').toLowerCase();
      const dl = (f.displayLabel || '').toLowerCase();
      return ['opd_status', 'opdstatus', 'opd'].includes(fn) || dl.includes('opd');
    });
    if (opdField && opdField.options && opdField.options.length > 0) {
      return ["OPD Status", ...opdField.options];
    }
    // Fallback: check filterMeta.fieldOptions for any OPD-related key
    const fo = filterMeta?.fieldOptions || {};
    for (const [key, opts] of Object.entries(fo)) {
      const k = key.toLowerCase();
      if ((['opd_status', 'opdstatus', 'opd'].includes(k) || k.includes('opd')) && opts.length > 0) {
        return ["OPD Status", ...opts];
      }
    }
    // Default hardcoded if no config found
    return ["OPD Status", "booked", "done", "pending","cancelled"];
  }, [fieldConfigs, filterMeta?.fieldOptions]);

  const ipdOptions = useMemo(() => {
    const ipdField = fieldConfigs.find(f => {
      const fn = (f.fieldName || '').toLowerCase();
      const dl = (f.displayLabel || '').toLowerCase();
      return ['ipd_status', 'ipdstatus', 'ipd'].includes(fn) || dl.includes('ipd');
    });
    if (ipdField && ipdField.options && ipdField.options.length > 0) {
      return ["IPD Status", ...ipdField.options];
    }
    // Fallback: check filterMeta.fieldOptions for any OPD-related key
    const fo = filterMeta?.fieldOptions || {};
    for (const [key, opts] of Object.entries(fo)) {
      const k = key.toLowerCase();
      if ((['ipd_status', 'ipdstatus', 'ipd'].includes(k) || k.includes('ipd')) && opts.length > 0) {
        return ["IPD Status", ...opts];
      }
    }
    // Default hardcoded if no config found
    return ["IPD Status", "booked", "done", "pending","cancelled"];
  }, [fieldConfigs, filterMeta?.fieldOptions]);

  const diagOptions = useMemo(() => {
    const diagField = fieldConfigs.find(f => {
      const fn = (f.fieldName || '').toLowerCase();
      const dl = (f.displayLabel || '').toLowerCase();
      return ['diagnostics', 'diagnostic', 'diagnostic_non', 'diagnostic_status'].includes(fn) || dl.includes('diagnostic');
    });
    if (diagField && diagField.options && diagField.options.length > 0) {
      return ["Diagnostics", ...diagField.options];
    }
    const fo = filterMeta?.fieldOptions || {};
    for (const [key, opts] of Object.entries(fo)) {
      const k = key.toLowerCase();
      if ((['diagnostics', 'diagnostic'].includes(k) || k.includes('diagnostic')) && opts.length > 0) {
        return ["Diagnostics", ...opts];
      }
    }
    return ["Diagnostics"];
  }, [fieldConfigs, filterMeta?.fieldOptions]);

  const callerOptions = useMemo(() => {
    const base = [{ id: "All Callers", name: "All Callers" }, { id: "Unassigned", name: "Unassigned" }];
    return [...base, ...callers.map((c) => ({ id: c.id, name: c.name }))];
  }, [callers]);

  const followupOptions = useMemo(() => [
    { label: "Scheduled", value: "Scheduled" },
    { label: "Today", value: "Today" },
    { label: "Tomorrow", value: "Tomorrow" },
    { label: "This Week", value: "This Week" },
    { label: "Overdue", value: "Overdue" },
    { label: "Not Scheduled", value: "Not Scheduled" },
    { label: "All", value: "All" },
  ], []);

  const campaignOptions = useMemo(() => {
    return [{ id: "All Campaigns", name: "All Campaigns" }, ...campaigns.map(c => ({ id: c._id, name: c.name }))];
  }, [campaigns]);

  const resetFilters = useCallback(() => {
    setDateMode(DEFAULTS.date);
    setCustomFrom(DEFAULTS.from);
    setCustomTo(DEFAULTS.to);
    setSource(DEFAULTS.source);
    setCallerFilter(DEFAULTS.caller);
    setLeadStatus(DEFAULTS.status);
    setFollowupFilter(DEFAULTS.followup);
    setOpdStatus(DEFAULTS.opd);
    setIpdStatus(DEFAULTS.ipd);
    setDiagnostics(DEFAULTS.diag);
    setCampaignFilter(DEFAULTS.campaign);
    setSearch(DEFAULTS.search);
    setCustomFieldFilters({});
  }, []);

  return {
    filterState,
    // state
    dateMode, setDateMode,
    customFrom, setCustomFrom,
    customTo, setCustomTo,
    source, setSource,
    callerFilter, setCallerFilter,
    leadStatus, setLeadStatus,
    followupFilter, setFollowupFilter,
    opdStatus, setOpdStatus,
    ipdStatus, setIpdStatus,
    diagnostics, setDiagnostics,
    campaignFilter, setCampaignFilter,
    search, setSearch,
    debouncedSearch,
    customFieldFilters, setCustomFieldFilter, removeCustomFieldFilter,
    // options
    sourceOptions,
    leadStatusOptions,
    opdOptions,
    ipdOptions,
    diagOptions,
    callerOptions,
    followupOptions,
    campaignOptions,
    // actions
    resetFilters,
  };
}
