// src/utils/api.js
import axios from "axios";

// Re-export your socket helpers (unchanged)
export {
  initializeSocket,
  getSocket,
  connectSocket,
  disconnectSocket,
} from "./socket";

/* -------------------------------------------
 * Axios client
 * ----------------------------------------- */
export const BASE_URL = import.meta.env.PROD
  ? "/api/v1"
  : "https://medagg.online/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch { }
  return config;
});

/* -------------------------------------------
 * Normalizers & Enums (for consistent UI)
 * ----------------------------------------- */
const normalizeBooking = (b = {}) => ({
  id: b.id || b._id || null,
  booked: !!b.booked,
  date: b.date ? new Date(b.date) : null,
  time: b.time || "",
  hospital: b.hospital || "",
  doctor: b.doctor || "",
  status: b.status || "pending",
  surgery: b.surgery || "",
  caseType: b.caseType || "",
  payment: Number(b.payment ?? 0),
  remarks: b.remarks || "",
  doneDate: b.doneDate ? new Date(b.doneDate) : null,
  createdAt: b.createdAt ? new Date(b.createdAt) : null,
  updatedAt: b.updatedAt ? new Date(b.updatedAt) : null,
  ...b,
});

const mapBookings = (arr) =>
  Array.isArray(arr) ? arr.map(normalizeBooking) : [];

const normalizeLead = (raw = {}) => {
  const base = {
    id: raw.id || raw._id || raw.leadId || null,
    createdTime:
      raw.createdTime ||
      raw.created_time ||
      raw.createdAt ||
      raw.created_at ||
      null,
    fieldData: raw.fieldData || raw.field_data || [],
    status: raw.status || "new",
    notes: raw.notes || "",
    followUpAt: raw.followUpAt ? new Date(raw.followUpAt) : null,
    lastCallAt: raw.lastCallAt ? new Date(raw.lastCallAt) : null,
    callCount: Number(raw.callCount ?? 0),
    lastCallOutcome: raw.lastCallOutcome || "",
    ...raw,
  };
  base.opBookings = mapBookings(raw.opBookings || raw.op_bookings || []);
  base.ipBookings = mapBookings(raw.ipBookings || raw.ip_bookings || []);
  base.diagnosticBookings = mapBookings(raw.diagnosticBookings || raw.diagnostic_bookings || []);
  return base;
};

const normalizeUser = (u = {}) => {
  const { city, state, ...rest } = u;
  // role may be a string (legacy) or an object (populated Role doc)
  const rawRole = u.role;
  const role = rawRole && typeof rawRole === "object" ? rawRole : rawRole;
  return {
    ...rest,
    id: u._id || u.id || null,
    name: u.name || "",
    email: u.email || "",
    role,
    phone: u.phone || u.phoneNumber || "",
    initials: u.initials || "",
    target: Number(u.target ?? 0),
    state: Array.isArray(state) ? state : (state ? [state] : []),
    createdAt: u.createdAt ? new Date(u.createdAt) : null,
    updatedAt: u.updatedAt ? new Date(u.updatedAt) : null,
  };
};

const normalizeCallLog = (l = {}) => ({
  id: l.id || l._id || null,
  timestamp: l.timestamp ? new Date(l.timestamp) : (l.createdAt ? new Date(l.createdAt) : null),
  durationSec: Number(l.durationSec ?? 0),
  outcome: l.outcome || "",
  notes: l.notes || "",
  recordingUrl: l.recordingUrl || "",
  ...l,
});

const normalizeActivity = (a = {}) => ({
  id: a.id || a._id || null,
  leadId: (a.lead && (a.lead._id || a.lead.id)) || a.lead || null,
  action: a.action || "",
  description: a.description || "",
  diff: a.diff || {},
  meta: a.meta || {},
  actor: a.actor ? {
    id: a.actor._id || a.actor.id || null,
    name: a.actor.name || "",
    email: a.actor.email || "",
  } : null,
  createdAt: a.createdAt ? new Date(a.createdAt) : null,
});

export const LEAD_STATUSES = [
  "new",
  "in_progress",
  "contacted",
  "interested",
  "not_interested",
  "converted",
];

export const CALL_OUTCOMES = [
  "connected",
  "interested",
  "not_interested",
  "converted",
  "no_answer",
  "busy",
  "switched_off",
  "callback",
  "voicemail",
  "wrong_number",
  "do_not_disturb",
];

export const BOOKING_STATUSES = ["pending", "booked", "done", "cancelled"];

/* -------------------------------------------
 * AUTH
 * ----------------------------------------- */
export const register = async ({
  name,
  email,
  password,
  phone,
  country,
  currency,
  role,
  company,
}) => {
  const { data } = await axios.post(`${BASE_URL}/auth/register`, {
    name,
    email,
    password,
    phone,
    country,
    currency,
    role,
    company,
  });
  return data;
};

export const verifyEmail = async (token) => {
  if (typeof token !== "string") throw new Error("Token must be a string");
  const { data } = await axios.get(`${BASE_URL}/auth/verify-email/${token}`);
  return data;
};

export const resendVerification = async (email) => {
  const { data } = await axios.post(`${BASE_URL}/auth/resend-verification`, { email });
  return data;
};

export const login = async (email, password) => {
  const { data } = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await axios.post(`${BASE_URL}/auth/forgotpassword`, { email });
  return data;
};

export const resetPassword = async ({ email, otp, newPassword }) => {
  const { data } = await axios.post(`${BASE_URL}/auth/resetpassword`, {
    email,
    otp,
    newPassword,
  });
  return data;
};

export const getMe = async () => {
  const { data } = await axios.get(`${BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return data;
};

export const updateDetails = async (userData) => {
  const { data } = await axios.put(`${BASE_URL}/auth/updatedetails`, userData, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return data;
};

export const logout = async () => {
  const { data } = await axios.get(`${BASE_URL}/auth/logout`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return data;
};

/* -------------------------------------------
 * USERS
 * ----------------------------------------- */
export const getAllUsers = async (params = {}) => {
  const { data } = await api.get("/users", { params }); // e.g. ?role=caller
  const list = data?.users || data?.data?.users || data?.data || data;
  const arr = Array.isArray(list) ? list : list?.results || [];
  return arr.map(normalizeUser);
};

export const createUser = async (userData) => {
  const { data } = await api.post("/users", userData);
  return normalizeUser(data?.data || data);
};

export const updateUser = async (id, userData) => {
  const { data } = await api.put(`/users/${id}`, userData);
  return normalizeUser(data?.data || data);
};

export const deleteUser = async (id) => {
  const { data } = await api.delete(`/users/${id}`);
  return data;
};

/* -------------------------------------------
 * TEAMS
 * ----------------------------------------- */
export const getAllTeams = async () => {
  const { data } = await api.get("/teams");
  return data; // { success, count, data: [...] }
};

export const createTeam = async (payload) => {
  const { data } = await api.post("/teams", payload);
  return data; // { success, data }
};

export const updateTeam = async (id, payload) => {
  const { data } = await api.put(`/teams/${id}`, payload);
  return data; // { success, data }
};

export const deleteTeam = async (id) => {
  const { data } = await api.delete(`/teams/${id}`);
  return data; // { success, data: {} }
};

/* -------------------------------------------
 * LEADS: List / Filter / Bulk operations
 * ----------------------------------------- */

export const importLeadsFromJson = async () => {
  const { data } = await api.get("/leads/import-leads");
  return data;
};

// All leads — server-paginated
export const fetchAllLeads = async (params = {}) => {
  const { data } = await api.get("/leads", { params });
  const rows = data?.leads || data?.data || [];
  return {
    page: Number(data?.page ?? params.page ?? 1),
    limit: Number(data?.limit ?? params.limit ?? 20),
    total: Number(data?.total ?? rows.length),
    totalPages: Number(data?.totalPages ?? 1),
    leads: rows.map(normalizeLead),
  };
};

// Filter metadata (sources, statuses, caller counts)
export const fetchLeadFilterMeta = async () => {
  const { data } = await api.get("/leads/filter-meta");
  return data; // { sources, statuses, callerCounts }
};

export const deleteLeads = async (leadIds) => {
  const { data } = await api.post("/leads/delete", { leadIds });
  return data;
};

export const assignLeadsByLocation = async (payload) => {
  const res = await api.post("/leads/assign-location", payload);
  return res.data;
};

// Today's leads
export const fetchTodayLeads = async () => {
  const { data } = await api.get("/leads/today");
  const rows = data?.leads || data?.data || [];
  return {
    count: data?.count ?? rows.length,
    leads: rows.map(normalizeLead),
  };
};

// Leads by specific date (YYYY-MM-DD)
export const fetchLeadsByDate = async (date) => {
  const { data } = await api.get("/leads/by-date", { params: { date } });
  const rows = data?.leads || data?.data || [];
  return {
    count: data?.count ?? rows.length,
    leads: rows.map(normalizeLead),
  };
};



// Assign leads to a caller
export const assignLeadsToCaller = async (leadIds = [], callerId) => {
  const { data } = await api.post("/leads/assign", { leadIds, callerId });
  return data; // { message, ... }
};

/* -------------------------------------------
 * LEADS: Detail / Status / Bookings / Calls
 * ----------------------------------------- */

/**
 * GET /leads/assigned — assigned leads for current user
 */
export const fetchMyAssignedLeads = async (params = {}) => {
  try {
    const { data } = await api.get("/leads/assigned", { params });
    const rows = data?.data || data?.leads || [];
    return {
      page: Number(data?.page ?? params.page ?? 1),
      limit: Number(data?.limit ?? params.limit ?? 20),
      total: Number(data?.total ?? rows.length),
      leads: rows.map(normalizeLead),
    };
  } catch (err) {
    if (err?.response?.status === 404) {
      // Fallback
      const { data } = await api.get("/leads", { params: { ...params, assignedTo: 'me' } });
      const rows = data?.leads || [];
      return {
        page: Number(data?.page ?? params.page ?? 1),
        limit: Number(data?.limit ?? params.limit ?? 20),
        total: Number(data?.total ?? rows.length),
        leads: rows.map(normalizeLead),
      };
    }
    throw err;
  }
};

// Alias if legacy code calls this:
export const fetchAssignedLeads = async (params = {}) => fetchMyAssignedLeads(params);

/**
 * GET /caller/leads/:id — flat detail (permission-based, works for all roles)
 * Fallback: GET /leads/:id — returns { lead, activity } wrapper
 */
export const fetchLeadDetail = async (id) => {
  try {
    const { data } = await api.get(`/caller/leads/${id}`);
    const lead = normalizeLead(data);
    lead.opBookings = mapBookings(data?.opBookings || data?.op_bookings || []);
    lead.ipBookings = mapBookings(data?.ipBookings || data?.ip_bookings || []);
    lead.diagnosticBookings = mapBookings(data?.diagnosticBookings || data?.diagnostic_bookings || []);
    lead.documents = data?.documents || [];
    return lead;
  } catch (err) {
    // Fallback to /leads/:id which returns { lead, activity } — no role restriction
    if (err?.response?.status === 404 || err?.response?.status === 403) {
      const { data } = await api.get(`/leads/${id}`);
      const raw = data?.lead || data;
      const lead = normalizeLead(raw);
      lead.opBookings = mapBookings(raw?.opBookings || raw?.op_bookings || []);
      lead.ipBookings = mapBookings(raw?.ipBookings || raw?.ip_bookings || []);
      lead.diagnosticBookings = mapBookings(raw?.diagnosticBookings || raw?.diagnostic_bookings || []);
      lead.documents = raw?.documents || [];
      return lead;
    }
    throw err;
  }
};

/**
 * PATCH /caller/leads/:id/status — update lead status (permission-based)
 * body: { status?, notes?, followUpAt? (ISO) }
 */
export const updateLeadStatus = async (id, payload = {}) => {
  const { data } = await api.patch(`/caller/leads/${id}/status`, payload);
  return data; // { message, id }
};

/**
 * PATCH /caller/leads/:id
 * payload can include fieldData / fieldDataUpdates and:
 *   opBookingsAdd / opBookingsUpdate / opBookingsRemove
 *   ipBookingsAdd / ipBookingsUpdate / ipBookingsRemove
 *   diagnosticBookingsAdd / diagnosticBookingsUpdate / diagnosticBookingsRemove
 */
export const updateLeadDetails = async (id, payload = {}) => {
  const { data } = await api.patch(`/caller/leads/${id}`, payload);
  return {
    message: data?.message || "Updated",
    id: data?.id,
    fieldData: data?.field_data || data?.fieldData || [],
    status: data?.status,
    notes: data?.notes,
    followUpAt: data?.followUpAt ? new Date(data.followUpAt) : null,
    opBookings: mapBookings(data?.opBookings || data?.op_bookings || []),
    ipBookings: mapBookings(data?.ipBookings || data?.ip_bookings || []),
    diagnosticBookings: mapBookings(data?.diagnosticBookings || data?.diagnostic_bookings || []),
  };
};

/**
 * POST /caller/leads/:id/defer
 * Accepts:
 *  - Without `date`: moves to tomorrow (back-compat), with optional { hour, minute } or { keepTime: true }.
 *  - With `date`: schedules to a specific date while preserving IST semantics.
 *      { date: 'YYYY-MM-DD' | ISOString, keepTime?: boolean, hour?: number, minute?: number }
 * Returns: { message, followUpAt(Date) }
 */
export const deferLeadToNextDay = async (id, opts = {}) => {
  const { data } = await api.post(`/caller/leads/${id}/defer`, opts);
  return {
    message: data?.message || (opts?.date ? "Follow-up rescheduled" : "Follow-up moved to next day"),
    followUpAt: data?.followUpAt ? new Date(data.followUpAt) : null,
  };
};

// New friendly wrapper for explicit reschedule (any date)
export const rescheduleLeadFollowUp = async (id, { date, keepTime = false, hour, minute } = {}) => {
  const payload = {};
  if (date != null) payload.date = date;         // 'YYYY-MM-DD' (IST) or ISO string
  if (keepTime != null) payload.keepTime = !!keepTime;
  if (Number.isFinite(hour)) payload.hour = Number(hour);
  if (Number.isFinite(minute)) payload.minute = Number(minute);
  return deferLeadToNextDay(id, payload);
};

// Optional alias with a shorter name, if you prefer in UI code.
export const scheduleLeadFollowUp = rescheduleLeadFollowUp;

/**
 * POST /caller/leads/:id/calls
 * body: { durationSec?, outcome(required), notes?, recordingUrl?, nextFollowUpAt?, setStatus? }
 */
export const logCall = async (id, payload) => {
  const { data } = await api.post(`/caller/leads/${id}/calls`, payload);
  return data; // { message, callLogId }
};

/**
 * GET /caller/leads/:id/calls — call logs for a lead (permission-based)
 */
export const fetchLeadCallLogs = async (id) => {
  try {
    const { data } = await api.get(`/caller/leads/${id}/calls`);
    const rows = data?.data || [];
    return {
      count: data?.count ?? rows.length,
      logs: rows.map(normalizeCallLog),
    };
  } catch {
    // Return empty rather than throwing — don't break the page
    return { count: 0, logs: [] };
  }
};

/**
 * GET /caller/followups/today
 */
export const fetchTodayFollowUps = async () => {
  const { data } = await api.get("/caller/followups/today");
  const rows = data?.data || [];
  return {
    count: data?.count ?? rows.length,
    leads: rows.map(normalizeLead),
  };
};

/**
 * GET /caller/followups?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export const fetchFollowUpsByRange = async ({ from, to }) => {
  const { data } = await api.get("/caller/followups", { params: { from, to } });
  const rows = data?.data || [];
  return {
    count: data?.count ?? rows.length,
    leads: rows.map(normalizeLead),
  };
};

/**
 * GET /caller/stats
 */
export const fetchMyStats = async () => {
  const { data } = await api.get("/caller/stats");
  return {
    totalAssigned: Number(data?.totalAssigned ?? 0),
    contacted: Number(data?.contacted ?? 0),
    interested: Number(data?.interested ?? 0),
    converted: Number(data?.converted ?? 0),
    notInterested: Number(data?.notInterested ?? 0),
    todayNewLeads: Number(data?.todayNewLeads ?? 0),
    opdBookedToday: Number(data?.opdBookedToday ?? 0),
    opdDoneToday: Number(data?.opdDoneToday ?? 0),
    ipdDoneToday: Number(data?.ipdDoneToday ?? 0),
    inProgress: Number(data?.inProgress ?? 0),
  };
};

/**
 * GET /caller/stats/dashboard
 */
export const fetchDashboardStats = async () => {
  const { data } = await api.get("/caller/stats/dashboard");
  return data;
};

/**
 * GET /leads/admin/stats/dashboard — aggregated stats
 */
export const fetchAdminDashboardStats = async () => {
  const { data } = await api.get("/leads/admin/stats/dashboard");
  return data;
};

/**
 * GET /leads/admin/stats/dashboard-v2 — KPI cards, tables, BD trackers
 */
export const fetchAdminDashboardV2 = async (params = {}) => {
  const { data } = await api.get("/leads/admin/stats/dashboard-v2", { params });
  return data;
};

/**
 * GET /leads/admin/stats/activity — breakdown by caller
 */
export const fetchAdminActivityStats = async () => {
  const { data } = await api.get("/leads/admin/stats/activity");
  return data;
};

/**
 * GET /leads/admin/stats/caller/:callerId — stats for a specific caller
 */
export const fetchCallerDetailStats = async (callerId) => {
  const { data } = await api.get(`/leads/admin/stats/caller/${callerId}`);
  return data;
};

/* -------------------------------------------
 * OP booking item endpoints
 * ----------------------------------------- */
export const addOpBooking = async (leadId, payload = {}) => {
  const { data } = await api.post(`/caller/leads/${leadId}/op-bookings`, payload);
  return normalizeBooking(data?.booking || {});
};

export const updateOpBooking = async (leadId, bookingId, payload = {}) => {
  const { data } = await api.patch(`/caller/leads/${leadId}/op-bookings/${bookingId}`, payload);
  return normalizeBooking(data?.booking || {});
};

export const removeOpBooking = async (leadId, bookingId) => {
  const { data } = await api.delete(`/caller/leads/${leadId}/op-bookings/${bookingId}`);
  return data || { message: "Deleted" };
};

/* -------------------------------------------
 * IP booking item endpoints
 * ----------------------------------------- */
export const addIpBooking = async (leadId, payload = {}) => {
  const { data } = await api.post(`/caller/leads/${leadId}/ip-bookings`, payload);
  return normalizeBooking(data?.booking || {});
};

export const updateIpBooking = async (leadId, bookingId, payload = {}) => {
  const { data } = await api.patch(`/caller/leads/${leadId}/ip-bookings/${bookingId}`, payload);
  return normalizeBooking(data?.booking || {});
};

export const removeIpBooking = async (leadId, bookingId) => {
  const { data } = await api.delete(`/caller/leads/${leadId}/ip-bookings/${bookingId}`);
  return data || { message: "Deleted" };
};

/* -------------------------------------------
 * Diagnostic booking item endpoints
 * ----------------------------------------- */
export const addDiagnosticBooking = async (leadId, payload = {}) => {
  const { data } = await api.post(`/caller/leads/${leadId}/diagnostic-bookings`, payload);
  return normalizeBooking(data?.booking || {});
};

export const updateDiagnosticBooking = async (leadId, bookingId, payload = {}) => {
  const { data } = await api.patch(`/caller/leads/${leadId}/diagnostic-bookings/${bookingId}`, payload);
  return normalizeBooking(data?.booking || {});
};

export const removeDiagnosticBooking = async (leadId, bookingId) => {
  const { data } = await api.delete(`/caller/leads/${leadId}/diagnostic-bookings/${bookingId}`);
  return data || { message: "Deleted" };
};

/* -------------------------------------------
 * ACTIVITIES: routes per your new activityRoutes.js
 * ----------------------------------------- */

/**
 * GET /activities — all activities (requires permission)
 * Params: { lead?, actor?, action?, from?, to?, limit?, skip? }
 */
export const fetchAllActivitiesAdmin = async (params = {}) => {
  const { data } = await api.get("/activities", { params });
  const rows = data?.data || data?.activities || [];
  return {
    count: data?.count ?? rows.length,
    activities: rows.map(normalizeActivity),
  };
};

/**
 * GET /activities/mine — current user's activities
 */
export const fetchMyActivities = async (params = {}) => {
  const { data } = await api.get("/activities/mine", { params });
  const rows = data?.data || [];
  return {
    count: data?.count ?? rows.length,
    activities: rows.map(normalizeActivity),
  };
};

/**
 * GET /caller/leads/:id/activities — lead activities (permission-based)
 * Fallback: /activities/lead/:id
 */
export const fetchLeadActivities = async (leadId, params = {}) => {
  const tryParse = (data) => {
    const rows = data?.data || data?.activities || [];
    return {
      count: data?.count ?? rows.length,
      activities: rows.map(normalizeActivity),
    };
  };

  // Try caller route first (has the right format)
  try {
    const { data } = await api.get(`/caller/leads/${leadId}/activities`, { params });
    return tryParse(data);
  } catch {
    // Fallback to generic activity route
    try {
      const { data } = await api.get(`/activities/lead/${leadId}`, { params });
      return tryParse(data);
    } catch {
      // Return empty rather than throwing — don't break the page
      return { count: 0, activities: [] };
    }
  }
};

/**
 * GET /caller/followups/tomorrow
 */
export const fetchTomorrowFollowUps = async () => {
  const { data } = await api.get("/caller/followups/tomorrow");
  const rows = data?.data || [];
  return {
    count: data?.count ?? rows.length,
    leads: rows.map(normalizeLead),
  };
};

/**
 * GET /caller/leads/yesterday
 * Supports: ?q=&page=&limit=
 */
export const fetchYesterdayAssignedLeads = async (params = {}) => {
  const { data } = await api.get("/caller/leads/yesterday", { params });
  const rows = data?.data || data?.leads || [];
  return {
    page: Number(data?.page ?? params.page ?? 1),
    limit: Number(data?.limit ?? params.limit ?? 20),
    total: Number(data?.total ?? rows.length),
    leads: rows.map(normalizeLead),
  };
};

/**
 * GET /activities/search — search current user's lead activities
 * Params: { lead?, action?, from?, to?, limit?, skip? }
 */
export const searchMyActivities = async (params = {}) => {
  const { data } = await api.get("/activities/search", { params });
  const rows = data?.data || [];
  return {
    count: data?.count ?? rows.length,
    activities: rows.map(normalizeActivity),
  };
};

/**
 * DELETE /activities/:activityId
 */
export const deleteActivityAdmin = async (activityId) => {
  const { data } = await api.delete(`/activities/${activityId}`);
  return data || { message: "Deleted" };
};

export const requestMobileCall = async (leadId, phoneNumber) => {
  const { data } = await api.post("/calls/tasks", { leadId, phoneNumber });
  return data;
};

/* -------------------------------------------
 * DUPLICATE MANAGEMENT
 * ----------------------------------------- */
export const fetchDuplicates = async (params = {}) => {
  const { data } = await api.get("/leads/duplicates", { params });
  return data; // { success, page, limit, total, totalPages, data: [...] }
};

export const mergeLeads = async (payload) => {
  const { data } = await api.post("/leads/merge", payload);
  return data; // { success, message, primaryId }
};

export const bulkUpdateLeads = async (payload) => {
  const { data } = await api.post("/leads/bulk-update", payload);
  return data;
};

export const bulkUpdateByFilter = async (payload) => {
  const { data } = await api.post("/leads/bulk-update-by-filter", payload);
  return data;
};

/* -------------------------------------------
 * CAMPAIGNS
 * ----------------------------------------- */
export const fetchCampaigns = async (params = {}) => {
  const { data } = await api.get("/campaigns", { params });
  return data; // { success, count, data: [...] }
};

export const createCampaign = async (payload) => {
  const { data } = await api.post("/campaigns", payload);
  return data; // { success, data }
};

export const syncCampaign = async (id) => {
  const { data } = await api.post(`/campaigns/${id}/sync`);
  return data; // { success, message, count }
};

export const updateCampaign = async (id, payload) => {
  const { data } = await api.put(`/campaigns/${id}`, payload);
  return data; // { success, data }
};

export const uploadCampaignLeads = async (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(`/campaigns/${id}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { success, message, data: { uploadId, totalLeads, successCount, errorCount, errors } }
};

export const fetchUploadHistory = async (id) => {
  const { data } = await api.get(`/campaigns/${id}/uploads`);
  return data; // { success, count, data: [...] }
};

export const checkDuplicates = async (leads) => {
  const { data } = await api.post(`/campaigns/check-duplicates`, { leads });
  return data; // { success, duplicates: [{type, value}] }
};

export const bulkImportLeads = async (payload) => {
  // payload: { leads, campaignId, callers }
  const { data } = await api.post(`/campaigns/bulk-import`, payload);
  return data; // { success, message, count }
};

// Create a new lead (manual)
export const createLead = async (payload) => {
  const { data } = await api.post("/leads", payload);
  const raw = data?.data || data?.lead || {};
  return normalizeLead(raw);
};

/* -------------------------------------------
 * LEAD FIELD CONFIGURATION
 * ----------------------------------------- */
export const fetchLeadFields = async (params = {}) => {
  const { data } = await api.get("/lead-fields", { params });
  return data; // { success, count, data: [...] }
};

export const createLeadField = async (payload) => {
  const { data } = await api.post("/lead-fields", payload);
  return data; // { success, data }
};

export const updateLeadField = async (id, payload) => {
  const { data } = await api.put(`/lead-fields/${id}`, payload);
  return data; // { success, data }
};

export const deleteLeadField = async (id) => {
  const { data } = await api.delete(`/lead-fields/${id}`);
  return data; // { success, message }
};

export const reorderLeadFields = async (fieldOrders) => {
  const { data } = await api.patch("/lead-fields/reorder", { fieldOrders });
  return data; // { success, data: [...] }
};

/* -------------------------------------------
 * BOOKING FIELD CONFIGURATION
 * ----------------------------------------- */
export const fetchBookingFields = async (params = {}) => {
  const { data } = await api.get("/booking-fields", { params });
  return data; // { success, count, data: [...] }
};

export const createBookingField = async (payload) => {
  const { data } = await api.post("/booking-fields", payload);
  return data; // { success, data }
};

export const updateBookingField = async (id, payload) => {
  const { data } = await api.put(`/booking-fields/${id}`, payload);
  return data; // { success, data }
};

export const deleteBookingField = async (id) => {
  const { data } = await api.delete(`/booking-fields/${id}`);
  return data; // { success, message }
};

export const reorderBookingFields = async (fieldOrders) => {
  const { data } = await api.patch("/booking-fields/reorder", { fieldOrders });
  return data; // { success, data: [...] }
};

/* -------------------------------------------
 * LEAD STAGE CONFIGURATION
 * ----------------------------------------- */
export const fetchLeadStages = async (params = {}) => {
  const { data } = await api.get("/lead-stages", { params });
  return data; // { success, count, data: [...] }
};

export const createLeadStage = async (payload) => {
  const { data } = await api.post("/lead-stages", payload);
  return data; // { success, data }
};

export const updateLeadStage = async (id, payload) => {
  const { data } = await api.put(`/lead-stages/${id}`, payload);
  return data; // { success, data }
};

export const deleteLeadStage = async (id) => {
  const { data } = await api.delete(`/lead-stages/${id}`);
  return data; // { success, message }
};

export const reorderLeadStages = async (stageOrders) => {
  const { data } = await api.patch("/lead-stages/reorder", { stageOrders });
  return data; // { success, data: [...] }
};

/* -------------------------------------------
 * LEAD DOCUMENTS
 * ----------------------------------------- */
export const uploadLeadDocument = async (leadId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  // Using generic /leads route which supports both admin & caller roles
  const { data } = await api.post(`/leads/${leadId}/documents`, formData);
  return data; // { success, message, document }
};

export const deleteLeadDocument = async (leadId, docId) => {
  const { data } = await api.delete(`/leads/${leadId}/documents/${docId}`);
  return data; // { success, message }
};

/* -------------------------------------------
 * WHATSAPP TEMPLATES
 * ----------------------------------------- */
export const fetchWaTemplates = async () => {
  const { data } = await api.get("/wa-templates");
  return data; // { success, count, data: [...] }
};

export const createWaTemplate = async (payload) => {
  const { data } = await api.post("/wa-templates", payload);
  return data; // { success, data: template }
};

export const updateWaTemplate = async (id, payload) => {
  const { data } = await api.put(`/wa-templates/${id}`, payload);
  return data; // { success, data: template }
};

export const deleteWaTemplate = async (id) => {
  const { data } = await api.delete(`/wa-templates/${id}`);
  return data; // { success, message }
};

/* -------------------------------------------
 * ALARMS
 * ----------------------------------------- */
export const createAlarm = async (leadId, alarmTime, notes = "") => {
  const { data } = await api.post("/alarms", { leadId, alarmTime, notes });
  return data;
};

export const getUserAlarms = async (status = null, limit = 100) => {
  const params = {};
  if (status) params.status = status;
  if (limit) params.limit = limit;
  const { data } = await api.get("/alarms", { params });
  return Array.isArray(data) ? data : [];
};

export const getActiveAlarmsCount = async () => {
  const { data } = await api.get("/alarms/count");
  return data?.count ?? 0;
};

export const getLeadAlarm = async (leadId) => {
  const { data } = await api.get(`/alarms/lead/${leadId}`);
  return data;
};

export const updateAlarm = async (id, payload) => {
  const { data } = await api.patch(`/alarms/${id}`, payload);
  return data;
};

export const deleteAlarm = async (id) => {
  const { data } = await api.delete(`/alarms/${id}`);
  return data;
};

/* -------------------------------------------
 * HELP REQUESTS (Transfer / Share)
 * ----------------------------------------- */

/**
 * POST /caller/help-request
 * payload: { leadId, toCallerId, type: "transfer"|"share", reason? }
 */
export const createHelpRequest = async (payload) => {
  const { data } = await api.post("/caller/help-request", payload);
  return data;
};

/**
 * GET /caller/help-request?status=pending
 * Returns incoming help requests for current user.
 */
export const fetchIncomingHelpRequests = async (params = {}) => {
  const { data } = await api.get("/caller/help-request", { params });
  return { count: data?.count ?? 0, data: data?.data || [] };
};

/**
 * GET /caller/help-request/sent?status=pending
 * Returns outgoing help requests sent by current user.
 */
export const fetchSentHelpRequests = async (params = {}) => {
  const { data } = await api.get("/caller/help-request/sent", { params });
  return { count: data?.count ?? 0, data: data?.data || [] };
};

/**
 * PATCH /caller/help-request/:id/respond
 * body: { action: "accept"|"reject" }
 */
export const respondToHelpRequest = async (id, action) => {
  const { data } = await api.patch(`/caller/help-request/${id}/respond`, { action });
  return data;
};

/* -------------------------------------------
 * ROLES
 * ----------------------------------------- */
export const getRoles = async () => {
  const { data } = await api.get("/roles");
  return data; // { success, count, data: [...] }
};

export const getRole = async (id) => {
  const { data } = await api.get(`/roles/${id}`);
  return data; // { success, data }
};

export const createRole = async (payload) => {
  const { data } = await api.post("/roles", payload);
  return data; // { success, data }
};

export const updateRole = async (id, payload) => {
  const { data } = await api.put(`/roles/${id}`, payload);
  return data; // { success, data }
};

export const deleteRole = async (id, reassignTo) => {
  const { data } = await api.delete(`/roles/${id}`, { data: { reassignTo } });
  return data; // { success, message }
};

export const getPermissions = async () => {
  const { data } = await api.get("/roles/permissions");
  return data; // { success, data: PERMISSION_TREE }
};

export const apiClient = api;


