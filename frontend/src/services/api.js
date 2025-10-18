import axios from 'axios';
import { getAuthToken, removeAuthToken, isValidTokenStructure } from '../utils/secureAuth';

// Use environment variable for API URL with secure default
const API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://api.yourdomain.com/api'  // HTTPS for production
    : 'http://localhost:5002/api'       // HTTP allowed for local development
  );

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout for security
  withCredentials: false, // Explicitly disable credentials unless needed
});

// Request interceptor for adding auth token
api.interceptors.request.use(config => {
  const token = getAuthToken();
  if (token && isValidTokenStructure(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      removeAuthToken();
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Handle deactivated account
      const message = error.response?.data?.message || '';
      if (message.includes('deactivated')) {
        removeAuthToken();
        try {
          localStorage.setItem('deactivationMessage', message);
        } catch (storageError) {
          console.error('Failed to store deactivation message:', storageError);
        }
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;