import axios from 'axios';

const api = axios.create({
  baseURL: '/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Optionally redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints (use root path, not /v1)
const authApi = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add same interceptors to authApi
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  login: (data) => authApi.post('/auth/login', data),
  register: (data) => authApi.post('/auth/register', data),
  me: () => authApi.get('/auth/me'),
  organizations: () => authApi.get('/auth/organizations'),
};

export const analytics = {
  getDAU: (params) => api.get('/analytics/dau', { params }),
  getRevenue: (params) => api.get('/analytics/revenue', { params }),
  getEvents: (params) => api.get('/analytics/events', { params }),
  getLTV: (params) => api.get('/analytics/ltv', { params }),
};

export const llm = {
  getSummary: (data) => api.post('/llm/summary', data),
  getInsight: (type, data) => api.post(`/llm/insights/${type}`, data),
};

export default api;
