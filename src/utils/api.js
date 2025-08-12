// src/utils/api.js
import axios from "axios";

export {
  initializeSocket,
  getSocket,
  connectSocket,
  disconnectSocket,
} from "./socket";

const BASE_URL = "https://medagg.online/api/v1";

// Axios instance with auth header
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- Helpers ----
const normalizeLead = (raw = {}) => ({
  // unify ids/time/fields from your different responses
  id: raw.id || raw._id || raw.leadId,
  createdTime:
    raw.createdTime ||
    raw.created_time ||
    raw.createdAt ||
    raw.created_at ||
    null,
  fieldData: raw.fieldData || raw.field_data || [],
  ...raw,
});

const normalizeUser = (u = {}) => ({
  id: u._id,             // <- your API uses _id
  name: u.name || "",
  email: u.email || "",
  role: (u.role || "").toLowerCase(),
  phone: u.phone || "",
  createdAt: u.createdAt ? new Date(u.createdAt) : null,
  updatedAt: u.updatedAt ? new Date(u.updatedAt) : null,
});


// ---- Leads (Admin/Caller) ----

// Import leads from local JSON files (admin)
export const importLeadsFromJson = async () => {
  const { data } = await api.get("/leads/import-leads");
  return data;
};

// All leads (admin)
export const fetchAllLeads = async () => {
  const { data } = await api.get("/leads");
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
  return data; // { message: "...", ... }
};

// Fetch leads assigned to the logged-in caller (caller)
export const fetchAssignedLeads = async () => {
  const { data } = await api.get("/leads/assigned");
  const rows = data?.leads || data?.data || [];
  return {
    count: data?.count ?? rows.length,
    leads: rows.map(normalizeLead),
  };
};


export const register = async ({ name, email, password, phone, country, currency,role, company }) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      name,
      email,
      password,
      phone,
      country,
      currency,
      role,
      company 
    });
    return response.data;
  } catch (error) {
    console.error('Registration failed:', error.response?.data || error.message);
    throw error;
  }
};

export const verifyEmail = async (token) => {
  if (typeof token !== 'string') {
    throw new Error('Token must be a string');
  }

  try {
    const response = await axios.get(`${BASE_URL}/auth/verify-email/${token}`);
    return response.data;
  } catch (error) {
    console.error('Email verification failed:', error.response?.data || error.message);
    throw error;
  }
};

export const resendVerification = async (email) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/resend-verification`, { email });
    return response.data;
  } catch (error) {
    console.error('Resend verification failed:', error.response?.data || error.message);
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// ✅ Forgot Password - Request OTP
export const forgotPassword = async (email) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/forgotpassword`, { email });
    return response.data;
  } catch (error) {
    console.error('Forgot password failed:', error.response?.data || error.message);
    throw error;
  }
};

// ✅ Reset Password with OTP
export const resetPassword = async ({ email, otp, newPassword }) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/resetpassword`, {
      email,
      otp,
      newPassword
    });
    return response.data;
  } catch (error) {
    console.error('Reset password failed:', error.response?.data || error.message);
    throw error;
  }
};

export const getMe = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
};


export const getAllUsers = async (params = {}) => {
  const { data } = await api.get("/users", { params }); // supports ?role=caller if backend allows
  const list = data?.users || data?.data?.users || data?.data || data;
  const arr = Array.isArray(list) ? list : list?.results || [];
  return arr.map(normalizeUser);
};

export const updateDetails = async (userData) => {
  try {
    const response = await axios.put(`${BASE_URL}/auth/updatedetails`, userData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Update details failed:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/auth/logout`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
};


