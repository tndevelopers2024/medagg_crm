/**
 * Builds a /leads URL with filter query params.
 * Mirrors the param keys used by useLeadFilters so navigation is
 * automatically picked up on mount — no location.state hacks needed.
 *
 * Usage:
 *   navigate(buildLeadsUrl({ dateMode: 'Today' }))
 *   navigate(buildLeadsUrl({ opdStatus: 'Booked', opdDate: '2026-03-12' }))
 *   navigate(buildLeadsUrl({ ipdStatus: 'Booked', ipdDate: '2026-03-06', ipdDateTo: '2026-03-12', filterOperators: { ipdDate: 'custom' } }))
 *
 * Supported filter keys (all optional):
 *   dateMode           — 'Today' | 'Yesterday' | '7d' | '30d' | 'Custom'
 *   customFrom / customTo
 *   source, leadStatus, callerFilter, followupFilter, followupFrom, followupTo
 *   opdStatus          — 'Booked' | 'Done' | 'Cancelled'
 *   opdDate / opdDateTo
 *   ipdStatus          — 'Booked' | 'Done' | 'Cancelled'
 *   ipdDate / ipdDateTo
 *   diagnostics, diagBookingStatus, hasSurgery, diagCaseType
 *   campaignFilter, search
 *   filterOperators    — { opdDate: 'custom', ipdDate: 'custom', ... }
 */
export function buildLeadsUrl(filter = {}) {
  const params = new URLSearchParams();

  const set = (key, value) => { if (value) params.set(key, value); };
  const setArr = (key, value) => {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    if (arr.length > 0) params.set(key, arr.join(','));
  };

  set('date', filter.dateMode);
  set('from', filter.customFrom);
  set('to', filter.customTo);
  set('source', filter.source);
  setArr('status', filter.leadStatus);
  setArr('caller', filter.callerFilter);

  if (filter.followupFilter && filter.followupFilter !== 'All') {
    set('followup', filter.followupFilter);
  }
  set('followupFrom', filter.followupFrom);
  set('followupTo', filter.followupTo);

  set('opd', filter.opdStatus);
  set('opdDate', filter.opdDate);
  set('opdDateTo', filter.opdDateTo);

  set('ipd', filter.ipdStatus);
  set('ipdDate', filter.ipdDate);
  set('ipdDateTo', filter.ipdDateTo);

  set('diag', filter.diagnostics);
  set('diagBook', filter.diagBookingStatus);
  set('diagDate', filter.diagDate);
  set('diagDateTo', filter.diagDateTo);
  if (filter.hasSurgery) params.set('hasSurgery', '1');
  if (filter.diagCaseType) params.set('diagCaseType', '1');

  setArr('campaign', filter.campaignFilter);
  set('search', filter.search);
  set('batch', filter.batch);

  // Called-in-period filter — for BD tracker drill-through (shows leads actually called in period)
  set('calledBy', filter.calledBy);
  set('calledFrom', filter.calledFrom);
  set('calledTo', filter.calledTo);

  // Filter operators (e.g. { opdDate: 'custom', ipdDate: 'custom' })
  if (filter.filterOperators && typeof filter.filterOperators === 'object') {
    const nonDefault = Object.entries(filter.filterOperators)
      .filter(([, v]) => v && v !== 'is');
    if (nonDefault.length > 0) {
      params.set('ops', nonDefault.map(([k, v]) => `${k}:${v}`).join(','));
    }
  }

  const qs = params.toString();
  return `/leads${qs ? `?${qs}` : ''}`;
}

/**
 * Map a dashboard table column key to allleads metric filter params.
 */
export function colKeyToMetricFilter(colKey) {
  switch (colKey) {
    case 'opBooked':         return { opdStatus: 'Booked' };
    case 'opDone':           return { opdStatus: 'Done' };
    case 'ipBooked':         return { ipdStatus: 'Booked' };
    case 'ipDone':           return { ipdStatus: 'Done' };
    case 'diagnosticBooked': return { diagBookingStatus: 'Booked' };
    case 'diagnosticDone':   return { diagBookingStatus: 'Done' };
    case 'surgerySuggested': return { hasSurgery: true };
    default:                 return {};
  }
}

/**
 * Build a /leads URL from a dashboard table cell click.
 * @param {object} entityFilter — e.g. { search: 'kochi' }, { campaignFilter: ['id'] }, { callerFilter: ['id'] }
 * @param {string} colKey       — dashboard table column key (e.g. 'opBooked', 'totalLeads')
 * @param {string} datePreset   — dashboard date preset (e.g. 'today', 'this_month')
 * @param {object} [customRange] — { from, to } strings for 'custom' preset
 */
export function buildDashboardCellUrl(entityFilter, colKey, datePreset, customRange = {}) {
  const dateFilter   = dashboardPresetToDateFilter(datePreset, customRange);
  const metricFilter = colKeyToMetricFilter(colKey);
  return buildLeadsUrl({ ...dateFilter, ...entityFilter, ...metricFilter });
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Format a JS Date as YYYY-MM-DD in IST */
function fmtIST(d) {
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

/**
 * Compute { from, to } date strings (IST) for a dashboard date preset.
 * Returns same string for both when it's a single day (today / yesterday).
 */
function presetToRange(preset, customRange = {}) {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: fmtIST(now), to: fmtIST(now) };
    case 'yesterday': {
      const y = new Date(now.getTime() - 86400000);
      return { from: fmtIST(y), to: fmtIST(y) };
    }
    case 'this_week': {
      const d = new Date(now);
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - day + 1);
      return { from: fmtIST(d), to: fmtIST(now) };
    }
    case 'last_week': {
      const d = new Date(now);
      const day = d.getDay() || 7;
      const thisMonday = new Date(d);
      thisMonday.setDate(d.getDate() - day + 1);
      const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000);
      const lastSunday = new Date(thisMonday.getTime() - 86400000);
      return { from: fmtIST(lastMonday), to: fmtIST(lastSunday) };
    }
    case 'this_month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmtIST(first), to: fmtIST(now) };
    }
    case 'last_month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmtIST(first), to: fmtIST(last) };
    }
    case 'custom':
      return { from: customRange.from || fmtIST(now), to: customRange.to || fmtIST(now) };
    default:
      return { from: fmtIST(now), to: fmtIST(now) };
  }
}

// Caller dashboard uses Title-case preset values; map them to the internal keys
const CALLER_TO_PRESET = {
  'Today':      'today',
  'Yesterday':  'yesterday',
  'This Week':  'this_week',
  'Last Week':  'last_week',
  'This Month': 'this_month',
  'Last Month': 'last_month',
  'Custom':     'custom',
};

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Convert a dashboard date preset into allleads createdTime filter params.
 * Used for the "Today's Leads" and "Pending Leads" cards.
 */
export function dashboardPresetToDateFilter(preset, customRange = {}) {
  if (preset === 'today') return { dateMode: 'Today' };
  if (preset === 'yesterday') return { dateMode: 'Yesterday' };
  const { from, to } = presetToRange(preset, customRange);
  return { dateMode: 'Custom', customFrom: from, customTo: to };
}

/**
 * Build a called-in-period filter for BD Activity Tracker drill-through.
 * Uses CallLog-based lookup on the backend (same data source as uniqueDials).
 * @param {string} callerId — caller user ID
 * @param {string} preset   — dashboard date preset
 * @param {object} customRange — { from, to } for 'custom' preset
 */
export function buildCalledInPeriodFilter(callerId, preset, customRange = {}) {
  const { from, to } = presetToRange(preset, customRange);
  return { calledBy: String(callerId), calledFrom: from, calledTo: to };
}

/**
 * Caller dashboard helpers — convert caller date range values to allleads filter params.
 * Usage:
 *   navigate(buildLeadsUrl({ ...callerRangeToLeadsFilter(dateRange, customFrom, customTo), status: ['New Lead'] }))
 *   navigate(buildLeadsUrl({ ...callerRangeToBookingDateFilter(dateRange, customFrom, customTo, 'opd'), opdStatus: 'Booked' }))
 */
export function callerRangeToLeadsFilter(dateRange, customFrom, customTo) {
  const preset = CALLER_TO_PRESET[dateRange] || 'today';
  return dashboardPresetToDateFilter(preset, { from: customFrom || '', to: customTo || '' });
}

export function callerRangeToCalledFilter(callerId, dateRange, customFrom, customTo) {
  const preset = CALLER_TO_PRESET[dateRange] || 'today';
  return buildCalledInPeriodFilter(String(callerId), preset, { from: customFrom || '', to: customTo || '' });
}

export function callerRangeToBookingDateFilter(dateRange, customFrom, customTo, type = 'opd') {
  const preset = CALLER_TO_PRESET[dateRange] || 'today';
  return dashboardPresetToBookingDateFilter(preset, { from: customFrom || '', to: customTo || '' }, type);
}

/** Label prefix for card titles based on caller date range */
export function callerRangeLabel(dateRange) {
  const labels = {
    'Today':      "Today's",
    'Yesterday':  "Yesterday's",
    'This Week':  "This Week's",
    'Last Week':  "Last Week's",
    'This Month': "This Month's",
    'Last Month': "Last Month's",
    'Custom':     "Period",
  };
  return labels[dateRange] || "Today's";
}

/**
 * Convert a dashboard date preset into allleads OPD or IPD booking-date filter params.
 * Used for OP Booked/Done and IP Booked/Done cards.
 *
 * @param {'opd'|'ipd'|'diag'} type
 * @returns filter object ready for buildLeadsUrl()
 */
export function dashboardPresetToBookingDateFilter(preset, customRange = {}, type = 'opd') {
  const dateKey   = type === 'opd' ? 'opdDate'  : type === 'ipd' ? 'ipdDate'  : 'diagDate';
  const dateToKey = type === 'opd' ? 'opdDateTo' : type === 'ipd' ? 'ipdDateTo' : 'diagDateTo';
  const opKey     = dateKey; // key inside filterOperators

  const { from, to } = presetToRange(preset, customRange);

  if (from === to) {
    // Single day — no range operator needed
    return { [dateKey]: from };
  }

  // Date range — requires the 'custom' operator so the backend uses $gte/$lte
  return {
    [dateKey]: from,
    [dateToKey]: to,
    filterOperators: { [opKey]: 'custom' },
  };
}
