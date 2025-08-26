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
export const BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  "https://medagg.online/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
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
  return base;
};

const normalizeUser = (u = {}) => ({
  id: u._id || u.id || null,
  name: u.name || "",
  email: u.email || "",
  role: (u.role || "").toLowerCase(),
  phone: u.phone || u.phoneNumber || "",
  createdAt: u.createdAt ? new Date(u.createdAt) : null,
  updatedAt: u.updatedAt ? new Date(u.updatedAt) : null,
  ...u,
});

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
 * USERS (admin or general list)
 * ----------------------------------------- */
export const getAllUsers = async (params = {}) => {
  const { data } = await api.get("/users", { params }); // e.g. ?role=caller
  const list = data?.users || data?.data?.users || data?.data || data;
  const arr = Array.isArray(list) ? list : list?.results || [];
  return arr.map(normalizeUser);
};

/* -------------------------------------------
 * LEADS: Admin endpoints
 * ----------------------------------------- */

// Import leads from local JSON files (admin)
export const importLeadsFromJson = async () => {
  const { data } = await api.get("/leads/import-leads");
  return data;
};

// All leads (admin)
export const fetchAllLeads = async (params = {}) => {
  const { data } = await api.get("/leads", { params });
  const rows = data?.leads || data?.data || [];
  return {
    count: data?.count ?? rows.length,
    leads: rows.map(normalizeLead),
  };
};

// Today's leads (admin)
export const fetchTodayLeads = async () => {
  const { data } = await api.get("/leads/today");
  const rows = data?.leads || data?.data || [];
  return {
    count: data?.count ?? rows.length,
    leads: rows.map(normalizeLead),
  };
};

// Leads by specific date (YYYY-MM-DD) (admin)
export const fetchLeadsByDate = async (date) => {
  const { data } = await api.get("/leads/by-date", { params: { date } });
  const rows = data?.leads || data?.data || [];
  return {
    count: data?.count ?? rows.length,
    leads: rows.map(normalizeLead),
  };
};

// Generate fake leads without saving (admin)
export const generateTestLeads = async (count = 5) => {
  const { data } = await api.get("/leads/test", { params: { count } });
  return data?.data ?? [];
};

// Assign leads to a caller (admin)
export const assignLeadsToCaller = async (leadIds = [], callerId) => {
  const { data } = await api.post("/leads/assign", { leadIds, callerId });
  return data; // { message, ... }
};

/* -------------------------------------------
 * LEADS: Caller endpoints (OP/IP bookings etc.)
 * ----------------------------------------- */

/**
 * GET /leads/assigned  (caller)   — preferred
 * Fallback: GET /caller/leads/assigned
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
      // backward compatible with older /caller prefix
      const { data } = await api.get("/caller/leads/assigned", { params });
      const rows = data?.data || [];
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
 * GET /caller/leads/:id
 */
export const fetchLeadDetail = async (id) => {
  const { data } = await api.get(`/caller/leads/${id}`);
  const lead = normalizeLead(data);
  lead.opBookings = mapBookings(data?.opBookings || data?.op_bookings || []);
  lead.ipBookings = mapBookings(data?.ipBookings || data?.ip_bookings || []);
  return lead;
};

/**
 * PATCH /caller/leads/:id/status
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
  };
};

/**
 * POST /caller/leads/:id/calls
 * body: { durationSec?, outcome(required), notes?, recordingUrl?, nextFollowUpAt?, setStatus? }
 */
export const logCall = async (id, payload) => {
  const { data } = await api.post(`/caller/leads/${id}/calls`, payload);
  return data; // { message, callLogId }
};

/**
 * GET /caller/leads/:id/calls
 */
export const fetchLeadCallLogs = async (id) => {
  const { data } = await api.get(`/caller/leads/${id}/calls`);
  const rows = data?.data || [];
  return {
    count: data?.count ?? rows.length,
    logs: rows.map(normalizeCallLog),
  };
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
    inProgress: Number(data?.inProgress ?? 0),
  };
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
 * ACTIVITIES: routes per your new activityRoutes.js
 * ----------------------------------------- */

/**
 * ADMIN — GET /activities
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
 * CALLER — GET /activities/mine
 */
export const fetchMyActivities = async (params = {}) => {
  const { data } = await api.get("/activities/mine", { params });
  const rows = data?.data || [];
  return {
    count: data?.count ?? rows.length,
    activities: rows.map(normalizeActivity),
  };
};


// src/utils/api.js
export const fetchLeadActivities = async (leadId, params = {}) => {
  try {
    const { data } = await api.get(`/activities/lead/${leadId}`, { params });
    const rows = data?.data || [];
    return {
      count: data?.count ?? rows.length,
      activities: rows.map(normalizeActivity),
    };
  } catch (err) {
    if (err?.response?.status === 404) {
      // fallback to old route
      const { data } = await api.get(`/caller/leads/${leadId}/activity`, { params });
      const rows = data?.data || [];
      return {
        count: data?.count ?? rows.length,
        activities: rows.map(normalizeActivity),
      };
    }
    throw err;
  }
};


/**
 * CALLER — GET /activities/search
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
 * ADMIN — DELETE /activities/:activityId
 */
export const deleteActivityAdmin = async (activityId) => {
  const { data } = await api.delete(`/activities/${activityId}`);
  return data || { message: "Deleted" };
};

export const requestMobileCall = async (leadId, phoneNumber) => {
  const { data } = await api.post("/calls/tasks", { leadId, phoneNumber });
  return data;
};

export const apiClient = api;
