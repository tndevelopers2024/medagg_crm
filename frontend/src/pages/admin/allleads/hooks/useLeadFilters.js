import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Default values — when a filter equals its default, it's omitted from the URL
const DEFAULTS = {
  date: "",
  from: "",
  to: "",
  source: "All Sources",
  caller: [],
  status: [],
  lostStatus: [],
  lostStatusFrom: "",
  lostStatusTo: "",
  lostStatusDate: "",
  lostStatusDateTo: "",
  followup: "All",
  followupFrom: "",
  followupTo: "",
  opd: "OPD Status",
  ipd: "IPD Status",
  diag: "Diagnostics",
  campaign: [],
  search: "",
  batch: "",
  statusFrom: "",
  statusTo: "",
  statusDate: "",
  statusDateTo: "",
  opdDate: "",
  opdDateTo: "",
  ipdDate: "",
  ipdDateTo: "",
  diagBook: "",     // diagnostic booking status: "Booked" | "Done" | ""
  diagDate: "",
  diagDateTo: "",
  hasSurgery: "",   // "1" when filtering by opBookings.surgery exists
  diagCaseType: "", // "1" when filtering by caseType=diagnostic
};

// All URL param keys owned by this hook — used to avoid overwriting analytics params
const FILTER_PARAM_KEYS = ['date', 'from', 'to', 'source', 'caller', 'status', 'lostStatus', 'lostStatusFrom', 'lostStatusTo', 'lostStatusDate', 'lostStatusDateTo', 'followup', 'followupFrom', 'followupTo', 'opd', 'ipd', 'diag', 'campaign', 'search', 'batch', 'statusFrom', 'statusTo', 'statusDate', 'statusDateTo', 'ops', 'cf', 'inc', 'opdDate', 'opdDateTo', 'ipdDate', 'ipdDateTo', 'diagBook', 'diagDate', 'diagDateTo', 'hasSurgery', 'diagCaseType'];

// Resolve legacy `view` param and special `date` values into concrete filter state
function resolveInitialParams(searchParams) {
  const raw = {};
  for (const key of Object.keys(DEFAULTS)) {
    const val = searchParams.get(key);
    if (val) {
      if (key === 'campaign' || key === 'status' || key === 'lostStatus' || key === 'caller') {
        raw[key] = val.split(',').filter(Boolean);
      } else {
        raw[key] = val;
      }
    }
  }

  // Parse filter operators (e.g. ops=status:is_not,caller:is)
  const opsParam = searchParams.get('ops');
  if (opsParam) {
    const ops = {};
    opsParam.split(',').forEach(pair => {
      const idx = pair.indexOf(':');
      if (idx > 0) ops[pair.slice(0, idx)] = pair.slice(idx + 1);
    });
    if (Object.keys(ops).length > 0) raw.ops = ops;
  }

  // Parse custom field filters (JSON-encoded)
  const cfParam = searchParams.get('cf');
  if (cfParam) {
    try { raw.cf = JSON.parse(cfParam); } catch (e) { /* ignore malformed */ }
  }

  // Parse include texts (JSON-encoded)
  const incParam = searchParams.get('inc');
  if (incParam) {
    try { raw.inc = JSON.parse(incParam); } catch (e) { /* ignore malformed */ }
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

  if (raw.status === "call_later" || (Array.isArray(raw.status) && raw.status.length === 1 && raw.status[0] === "call_later")) {
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
  const [callerFilter, setCallerFilter] = useState(
    Array.isArray(initialParams.caller) ? initialParams.caller : DEFAULTS.caller
  );
  const [leadStatus, setLeadStatus] = useState(
    Array.isArray(initialParams.status) ? initialParams.status : DEFAULTS.status
  );
  const [lostStatus, setLostStatus] = useState(
    Array.isArray(initialParams.lostStatus) ? initialParams.lostStatus : DEFAULTS.lostStatus
  );
  const [followupFilter, setFollowupFilter] = useState(initialParams.followup || DEFAULTS.followup);
  const [followupFrom, setFollowupFrom] = useState(initialParams.followupFrom || DEFAULTS.followupFrom);
  const [followupTo, setFollowupTo] = useState(initialParams.followupTo || DEFAULTS.followupTo);
  const [opdStatus, setOpdStatus] = useState(initialParams.opd || DEFAULTS.opd);
  const [ipdStatus, setIpdStatus] = useState(initialParams.ipd || DEFAULTS.ipd);
  const [diagnostics, setDiagnostics] = useState(initialParams.diag || DEFAULTS.diag);
  const [campaignFilter, setCampaignFilter] = useState(
    Array.isArray(initialParams.campaign) ? initialParams.campaign : DEFAULTS.campaign
  );
  const [search, setSearch] = useState(initialParams.search || DEFAULTS.search);
  const [batch, setBatch] = useState(initialParams.batch || DEFAULTS.batch);
  const [statusFrom, setStatusFrom] = useState(initialParams.statusFrom || '');
  const [statusTo, setStatusTo] = useState(initialParams.statusTo || '');
  const [lostStatusFrom, setLostStatusFrom] = useState(initialParams.lostStatusFrom || '');
  const [lostStatusTo, setLostStatusTo] = useState(initialParams.lostStatusTo || '');
  const [lostStatusDate, setLostStatusDate] = useState(initialParams.lostStatusDate || '');
  const [lostStatusDateTo, setLostStatusDateTo] = useState(initialParams.lostStatusDateTo || '');
  const [statusDate, setStatusDate] = useState(initialParams.statusDate || '');
  const [statusDateTo, setStatusDateTo] = useState(initialParams.statusDateTo || '');
  const [opdDate, setOpdDate] = useState(initialParams.opdDate || '');
  const [opdDateTo, setOpdDateTo] = useState(initialParams.opdDateTo || '');
  const [ipdDate, setIpdDate] = useState(initialParams.ipdDate || '');
  const [ipdDateTo, setIpdDateTo] = useState(initialParams.ipdDateTo || '');
  const [diagBookingStatus, setDiagBookingStatus] = useState(initialParams.diagBook || '');
  const [diagDate, setDiagDate] = useState(initialParams.diagDate || '');
  const [diagDateTo, setDiagDateTo] = useState(initialParams.diagDateTo || '');
  const [hasSurgery, setHasSurgery] = useState(initialParams.hasSurgery || '');
  const [diagCaseType, setDiagCaseType] = useState(initialParams.diagCaseType || '');

  // Filter operators — { filterKey: 'is' | 'is_not' | 'is_empty' | 'is_include' }
  const [filterOperators, setFilterOperators] = useState(initialParams.ops || {});

  // Include texts — { filterKey: string } — for IS INCLUDE operator
  const [filterIncludeTexts, setFilterIncludeTexts] = useState(initialParams.inc || {});

  const setFilterOperator = useCallback((key, op) => {
    setFilterOperators(prev => ({ ...prev, [key]: op }));
  }, []);

  const resetFilterOperators = useCallback(() => {
    setFilterOperators({});
  }, []);

  const setFilterIncludeText = useCallback((key, text) => {
    setFilterIncludeTexts(prev => {
      const next = { ...prev };
      if (text) next[key] = text;
      else delete next[key];
      return next;
    });
  }, []);

  // Custom field filters — { fieldName: { value, operator } }
  const [customFieldFilters, setCustomFieldFilters] = useState(initialParams.cf || {});

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
  // Uses functional setSearchParams to preserve params owned by other hooks (e.g. vm, ct, cfn)
  useEffect(() => {
    const params = {};
    if (dateMode !== DEFAULTS.date) params.date = dateMode;
    if (customFrom !== DEFAULTS.from) params.from = customFrom;
    if (customTo !== DEFAULTS.to) params.to = customTo;
    if (source !== DEFAULTS.source) params.source = source;
    if (callerFilter.length > 0) params.caller = callerFilter.join(',');
    if (leadStatus.length > 0) params.status = leadStatus.join(',');
    if (lostStatus.length > 0) params.lostStatus = lostStatus.join(',');
    if (followupFilter !== DEFAULTS.followup) params.followup = followupFilter;
    if (followupFrom !== DEFAULTS.followupFrom) params.followupFrom = followupFrom;
    if (followupTo !== DEFAULTS.followupTo) params.followupTo = followupTo;
    if (opdStatus !== DEFAULTS.opd) params.opd = opdStatus;
    if (ipdStatus !== DEFAULTS.ipd) params.ipd = ipdStatus;
    if (diagnostics !== DEFAULTS.diag) params.diag = diagnostics;
    if (campaignFilter.length > 0) params.campaign = campaignFilter.join(',');
    if (search !== DEFAULTS.search) params.search = search;
    if (batch !== DEFAULTS.batch) params.batch = batch;
    if (statusFrom) params.statusFrom = statusFrom;
    if (statusTo) params.statusTo = statusTo;
    if (statusDate) params.statusDate = statusDate;
    if (statusDateTo) params.statusDateTo = statusDateTo;
    if (lostStatusFrom) params.lostStatusFrom = lostStatusFrom;
    if (lostStatusTo) params.lostStatusTo = lostStatusTo;
    if (lostStatusDate) params.lostStatusDate = lostStatusDate;
    if (lostStatusDateTo) params.lostStatusDateTo = lostStatusDateTo;
    if (opdDate) params.opdDate = opdDate;
    if (opdDateTo) params.opdDateTo = opdDateTo;
    if (ipdDate) params.ipdDate = ipdDate;
    if (ipdDateTo) params.ipdDateTo = ipdDateTo;
    if (diagBookingStatus) params.diagBook = diagBookingStatus;
    if (diagDate) params.diagDate = diagDate;
    if (diagDateTo) params.diagDateTo = diagDateTo;
    if (hasSurgery) params.hasSurgery = hasSurgery;
    if (diagCaseType) params.diagCaseType = diagCaseType;

    // filterOperators — only include non-default ('is') entries
    const nonDefaultOps = Object.entries(filterOperators).filter(([, v]) => v && v !== 'is');
    if (nonDefaultOps.length > 0) {
      params.ops = nonDefaultOps.map(([k, v]) => `${k}:${v}`).join(',');
    }

    // customFieldFilters — JSON-encoded
    if (Object.keys(customFieldFilters).length > 0) {
      params.cf = JSON.stringify(customFieldFilters);
    }

    // filterIncludeTexts — JSON-encoded
    if (Object.keys(filterIncludeTexts).length > 0) {
      params.inc = JSON.stringify(filterIncludeTexts);
    }

    // Compare only filter-owned params to avoid false positives from analytics params
    const currentFilterParams = {};
    for (const key of FILTER_PARAM_KEYS) {
      const val = searchParams.get(key);
      if (val !== null) currentFilterParams[key] = val;
    }
    const hasChanged = Object.keys(params).length !== Object.keys(currentFilterParams).length ||
      Object.entries(params).some(([k, v]) => currentFilterParams[k] !== String(v));

    if (hasChanged) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        // Clear all filter-owned params, then set the new ones
        FILTER_PARAM_KEYS.forEach(k => next.delete(k));
        Object.entries(params).forEach(([k, v]) => next.set(k, v));
        return next;
      }, { replace: true });
    }
  }, [
    dateMode, customFrom, customTo, source, callerFilter, leadStatus,
    followupFilter, followupFrom, followupTo, opdStatus, ipdStatus, diagnostics, campaignFilter, search,
    filterOperators, customFieldFilters, filterIncludeTexts, opdDate, opdDateTo, ipdDate, ipdDateTo,
    diagBookingStatus, diagDate, diagDateTo, hasSurgery, diagCaseType,
    statusFrom, statusTo, statusDate, statusDateTo,
    setSearchParams, searchParams
  ]);

  // Sync URL → filter state (for external navigation like sidebar clicks or browser back)
  useEffect(() => {
    const params = resolveInitialParams(searchParams);

    // Update state to match URL. Since each state setter has its own comparison,
    // and we only call them if they differ, this is safe.
    if (JSON.stringify(params.campaign || []) !== JSON.stringify(campaignFilter)) {
      setCampaignFilter(params.campaign || []);
    }
    if ((params.date || "") !== dateMode) setDateMode(params.date || "");
    if ((params.from || "") !== customFrom) setCustomFrom(params.from || "");
    if ((params.to || "") !== customTo) setCustomTo(params.to || "");
    if ((params.source || "All Sources") !== source) setSource(params.source || "All Sources");
    if (JSON.stringify(params.caller || []) !== JSON.stringify(callerFilter)) {
      setCallerFilter(params.caller || []);
    }
    if (JSON.stringify(params.status || []) !== JSON.stringify(leadStatus)) {
      setLeadStatus(params.status || []);
    }
    if (JSON.stringify(params.lostStatus || []) !== JSON.stringify(lostStatus)) {
      setLostStatus(params.lostStatus || []);
    }
    if ((params.followup || "All") !== followupFilter) setFollowupFilter(params.followup || "All");
    if ((params.followupFrom || "") !== followupFrom) setFollowupFrom(params.followupFrom || "");
    if ((params.followupTo || "") !== followupTo) setFollowupTo(params.followupTo || "");
    if ((params.opd || "OPD Status") !== opdStatus) setOpdStatus(params.opd || "OPD Status");
    if ((params.ipd || "IPD Status") !== ipdStatus) setIpdStatus(params.ipd || "IPD Status");
    if ((params.diag || "Diagnostics") !== diagnostics) setDiagnostics(params.diag || "Diagnostics");
    if ((params.search || "") !== search) setSearch(params.search || "");
    if ((params.batch || "") !== batch) setBatch(params.batch || "");
    if ((statusFrom || "") !== statusFrom) setStatusFrom(params.statusFrom || "");
    if ((statusTo || "") !== statusTo) setStatusTo(params.statusTo || "");
    if ((params.statusDate || "") !== statusDate) setStatusDate(params.statusDate || "");
    if ((params.statusDateTo || "") !== statusDateTo) setStatusDateTo(params.statusDateTo || "");
    if ((params.lostStatusFrom || "") !== lostStatusFrom) setLostStatusFrom(params.lostStatusFrom || "");
    if ((params.lostStatusTo || "") !== lostStatusTo) setLostStatusTo(params.lostStatusTo || "");
    if ((params.lostStatusDate || "") !== lostStatusDate) setLostStatusDate(params.lostStatusDate || "");
    if ((params.lostStatusDateTo || "") !== lostStatusDateTo) setLostStatusDateTo(params.lostStatusDateTo || "");
    if ((params.opdDate || "") !== opdDate) setOpdDate(params.opdDate || "");
    if ((params.opdDateTo || "") !== opdDateTo) setOpdDateTo(params.opdDateTo || "");
    if ((params.ipdDate || "") !== ipdDate) setIpdDate(params.ipdDate || "");
    if ((params.ipdDateTo || "") !== ipdDateTo) setIpdDateTo(params.ipdDateTo || "");
    if ((params.diagBook || "") !== diagBookingStatus) setDiagBookingStatus(params.diagBook || "");
    if ((params.diagDate || "") !== diagDate) setDiagDate(params.diagDate || "");
    if ((params.diagDateTo || "") !== diagDateTo) setDiagDateTo(params.diagDateTo || "");
    if ((params.hasSurgery || "") !== hasSurgery) setHasSurgery(params.hasSurgery || "");
    if ((params.diagCaseType || "") !== diagCaseType) setDiagCaseType(params.diagCaseType || "");

    // filterOperators
    const newOps = params.ops || {};
    if (JSON.stringify(newOps) !== JSON.stringify(filterOperators)) setFilterOperators(newOps);

    // customFieldFilters
    const newCf = params.cf || {};
    if (JSON.stringify(newCf) !== JSON.stringify(customFieldFilters)) setCustomFieldFilters(newCf);

    // filterIncludeTexts
    const newInc = params.inc || {};
    if (JSON.stringify(newInc) !== JSON.stringify(filterIncludeTexts)) setFilterIncludeTexts(newInc);
  }, [searchParams]); // This effect listens to URL changes

  // Stable filterState object for the data hook (only changes when actual filter values change)
  const filterState = useMemo(() => ({
    dateMode,
    customFrom,
    customTo,
    source,
    callerFilter,
    leadStatus,
    lostStatus,
    followupFilter,
    followupFrom,
    followupTo,
    opdStatus,
    ipdStatus,
    diagnostics,
    campaignFilter,
    batch,
    statusFrom,
    statusTo,
    statusDate,
    statusDateTo,
    lostStatusFrom,
    lostStatusTo,
    lostStatusDate,
    lostStatusDateTo,
    debouncedSearch,
    customFieldFilters,
    filterOperators,
    filterIncludeTexts,
    opdDate,
    opdDateTo,
    ipdDate,
    ipdDateTo,
    diagBookingStatus,
    diagDate,
    diagDateTo,
    hasSurgery,
    diagCaseType,
  }), [
    dateMode, customFrom, customTo, source, callerFilter, leadStatus, lostStatus,
    followupFilter, followupFrom, followupTo, opdStatus, ipdStatus, diagnostics, campaignFilter, batch, statusFrom, statusTo, debouncedSearch,
    customFieldFilters, filterOperators, filterIncludeTexts, opdDate, opdDateTo, ipdDate, ipdDateTo,
    diagBookingStatus, diagDate, diagDateTo, hasSurgery, diagCaseType,
    statusDate, statusDateTo,
  ]);

  // Options derived from filterMeta and configs (not from scanning all leads)
  const sourceOptions = useMemo(
    () => ["All Sources", ...(filterMeta?.sources || [])],
    [filterMeta?.sources]
  );

  const leadStatusOptions = useMemo(() => {
    if (leadStages && leadStages.length > 0) {
      return leadStages
        .filter(s => s.stageCategory !== "lost")
        .map(stage => stage.displayLabel || stage.stageName);
    }
    const statusField = fieldConfigs.find(f => f.fieldName === 'lead_status' || f.fieldName === 'status');
    if (statusField && statusField.options && statusField.options.length > 0) {
      return [...statusField.options];
    }
    // Fallback to filterMeta statuses (might contain lost ones if meta API doesn't separate)
    return [...(filterMeta?.statuses || [])];
  }, [fieldConfigs, leadStages, filterMeta?.statuses]);

  const lostStatusOptions = useMemo(() => {
    if (leadStages && leadStages.length > 0) {
      return leadStages
        .filter(s => s.stageCategory === "lost")
        .map(stage => stage.displayLabel || stage.stageName);
    }
    return [];
  }, [leadStages]);

  // OPD/IPD booking statuses — always hardcoded to match the bookingStatusEnum in the Lead model
  const opdOptions = useMemo(() => ["OPD Status", "Booked", "Done", "Cancelled"], []);
  const ipdOptions = useMemo(() => ["IPD Status", "Booked", "Done", "Cancelled"], []);

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
    const base = [{ id: "Unassigned", name: "Unassigned" }];
    return [...base, ...callers.map((c) => ({ id: c.id, name: c.name }))];
  }, [callers]);

  const followupOptions = useMemo(() => [
    { label: "Scheduled", value: "Scheduled" },
    { label: "Today", value: "Today" },
    { label: "Tomorrow", value: "Tomorrow" },
    { label: "This Week", value: "This Week" },
    { label: "Overdue", value: "Overdue" },
    { label: "Not Scheduled", value: "Not Scheduled" },
    { label: "Custom", value: "Custom" },
    { label: "All", value: "All" },
  ], []);

  const campaignOptions = useMemo(() => {
    return campaigns.map(c => ({ id: c._id, name: c.name }));
  }, [campaigns]);

  const resetFilters = useCallback(() => {
    setDateMode(DEFAULTS.date);
    setCustomFrom(DEFAULTS.from);
    setCustomTo(DEFAULTS.to);
    setSource(DEFAULTS.source);
    setCallerFilter([]);
    setLeadStatus([]);
    setLostStatus([]);
    setFollowupFilter(DEFAULTS.followup);
    setFollowupFrom(DEFAULTS.followupFrom);
    setFollowupTo(DEFAULTS.followupTo);
    setOpdStatus(DEFAULTS.opd);
    setIpdStatus(DEFAULTS.ipd);
    setDiagnostics(DEFAULTS.diag);
    setCampaignFilter([]);
    setSearch(DEFAULTS.search);
    setCustomFieldFilters({});
    setFilterOperators({});
    setFilterIncludeTexts({});
    setOpdDate('');
    setOpdDateTo('');
    setIpdDate('');
    setIpdDateTo('');
    setDiagBookingStatus('');
    setDiagDate('');
    setDiagDateTo('');
    setHasSurgery('');
    setDiagCaseType('');
    setStatusFrom('');
    setStatusTo('');
    setStatusDate('');
    setStatusDateTo('');
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
    lostStatus, setLostStatus,
    followupFilter, setFollowupFilter,
    followupFrom, setFollowupFrom,
    followupTo, setFollowupTo,
    opdStatus, setOpdStatus,
    ipdStatus, setIpdStatus,
    diagnostics, setDiagnostics,
    campaignFilter, setCampaignFilter,
    batch, setBatch,
    statusFrom, setStatusFrom,
    statusTo, setStatusTo,
    statusDate, setStatusDate,
    statusDateTo, setStatusDateTo,
    lostStatusFrom, setLostStatusFrom,
    lostStatusTo, setLostStatusTo,
    lostStatusDate, setLostStatusDate,
    lostStatusDateTo, setLostStatusDateTo,
    search, setSearch,
    debouncedSearch,
    customFieldFilters, setCustomFieldFilter, removeCustomFieldFilter,
    filterOperators, setFilterOperator, resetFilterOperators,
    filterIncludeTexts, setFilterIncludeText,
    opdDate, setOpdDate,
    opdDateTo, setOpdDateTo,
    ipdDate, setIpdDate,
    ipdDateTo, setIpdDateTo,
    diagBookingStatus, setDiagBookingStatus,
    diagDate, setDiagDate,
    diagDateTo, setDiagDateTo,
    hasSurgery, setHasSurgery,
    diagCaseType, setDiagCaseType,
    // options
    sourceOptions,
    leadStatusOptions,
    lostStatusOptions,
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
