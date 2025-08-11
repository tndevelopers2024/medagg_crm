import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/v1';

export { 
  initializeSocket, 
  getSocket, 
  connectSocket, 
  disconnectSocket 
} from './socket';

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

export const getAllUsers = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
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


