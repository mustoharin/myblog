import axios from 'axios';

const API_URL = 'http://localhost:5002/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Handle deactivated account
      const message = error.response?.data?.message || '';
      if (message.includes('deactivated')) {
        localStorage.removeItem('token');
        localStorage.setItem('deactivationMessage', message);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;