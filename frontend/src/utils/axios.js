import axios from 'axios';
import toast from 'react-hot-toast';

// Get API URL from environment variable or use default
const getApiUrl = () => {
  // Priority: VITE_API_ROOT > VITE_API_URL > auto-detect > fallback
  return (
    import.meta.env.VITE_API_ROOT ||
    import.meta.env.VITE_API_URL ||
    (window.location.origin.includes('5173') ? 'http://localhost:8080' : window.location.origin) ||
    'http://localhost:8080'
  );
};

export const AXIOS_API_ROOT = getApiUrl();
const API_URL = AXIOS_API_ROOT;
console.log('[Axios] Using API URL:', API_URL);
console.log('[Axios] Window location:', window.location.origin);
console.log('[Axios] Environment vars:', { 
  VITE_API_ROOT: import.meta.env.VITE_API_ROOT, 
  VITE_API_URL: import.meta.env.VITE_API_URL 
});

export const USE_COOKIE_AUTH = (import.meta.env.VITE_USE_COOKIE_AUTH || '').toString().toLowerCase() === 'true';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_URL,
  // Do not set a global Content-Type: allow axios to set correct headers per request
  timeout: 120000, // 2 minute timeout for long operations
  withCredentials: USE_COOKIE_AUTH,
});

// Request interceptor to add JWT token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    // When using cookie-based auth, do not attach Authorization header
    if (!USE_COOKIE_AUTH) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      // Attach CSRF header if cookie is present
      const csrf = document.cookie.split('; ').find(r => r.startsWith('csrf_token='))?.split('=')[1];
      if (csrf) {
        config.headers['x-csrf-token'] = csrf;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Track if we're currently refreshing to avoid multiple refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Response interceptor to handle auth errors and automatic token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Friendly messages for common HTTP errors
    if (error.response) {
      const status = error.response.status;
      
      // Rate limiting
      if (status === 429) {
        toast.error('Too many attempts. Please wait a moment and try again.', { 
          id: 'rate-limit',
          duration: 6000 
        });
      }
      
      // Don't show generic errors for 401 - handled below
      // Don't show generic errors for 403 - handled below
    }
    
    // If 401 and we have a refresh path, try to refresh below; otherwise show guidance
    if (error.response && error.response.status === 401 && !originalRequest?._retry) {
      // Check if this is the refresh endpoint itself failing
      if (originalRequest.url === '/auth/refresh') {
        // Refresh token is invalid, logout user
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Show session expired message
        toast.error('Your session has expired. Please log in again.', {
          duration: 5000,
          id: 'session-expired' // Prevent duplicate toasts
        });
        
        // Redirect to login after a brief delay
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }, 1000);
        
        return Promise.reject(error);
      }
      
      const refreshToken = localStorage.getItem('refreshToken');
      
      // If no refresh token, logout
      if (!refreshToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Show session expired message
        toast.error('Your session has expired. Please log in again.', {
          duration: 5000,
          id: 'session-expired'
        });
        
        // Redirect to login after a brief delay
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }, 1000);
        
        return Promise.reject(error);
      }
      
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return axiosInstance(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }
      
      // Mark that we're refreshing
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        // Attempt to refresh the token
        const formData = new FormData();
        formData.append('refresh_token', refreshToken);
        
        const response = await axiosInstance.post('/auth/refresh', formData);
        
        if (response.data.success) {
          const { access_token, refresh_token: newRefreshToken } = response.data;
          
          // Store new tokens
          localStorage.setItem('token', access_token);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          
          // Update the authorization header
          axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + access_token;
          originalRequest.headers['Authorization'] = 'Bearer ' + access_token;
          
          // Process queued requests
          processQueue(null, access_token);
          
          // Retry the original request
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Show session expired message
        toast.error('Your session has expired. Please log in again.', {
          duration: 5000,
          id: 'session-expired'
        });
        
        // Redirect to login after a brief delay
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }, 1000);
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Friendly guidance for other common errors
    if (error.response) {
      const code = error.response.status;
      const url = error.config?.url || '';
      
      // Skip duplicate toasts for errors already handled above
      const skipToast = code === 429 || (code === 401 && error.config?._retry);
      
      if (!skipToast) {
        if (code === 400) {
          // Bad request - often validation errors
          const message = error.response.data?.detail || error.response.data?.error || 'Invalid request. Please check your input.';
          toast.error(message, { id: 'bad-request', duration: 5000 });
        } else if (code === 401) {
          toast.error('Authentication required. Please sign in again.', { id: 'auth-required' });
        } else if (code === 403) {
          toast.error('Access denied. You do not have permission to perform this action.', { id: 'forbidden' });
        } else if (code === 404) {
          toast.error('Requested resource not found.', { id: 'not-found', duration: 4000 });
        } else if (code === 409) {
          const message = error.response.data?.detail || error.response.data?.error || 'Conflict detected. The resource may have been modified.';
          toast.error(message, { id: 'conflict', duration: 5000 });
        } else if (code === 413) {
          toast.error('Upload too large. Please reduce file size or try uploading in chunks.', { id: 'payload-too-large', duration: 6000 });
        } else if (code === 422) {
          const message = error.response.data?.detail || error.response.data?.error || 'Validation failed. Please check your input.';
          toast.error(message, { id: 'validation-error', duration: 5000 });
        } else if (code === 500) {
          toast.error('Server error. Please try again later or contact support if the issue persists.', { id: 'server-error', duration: 6000 });
        } else if (code === 502 || code === 503 || code === 504) {
          toast.error('Service temporarily unavailable. Please try again in a moment.', { id: 'service-unavailable', duration: 6000 });
        }
      }
    } else if (error.request) {
      // Network error - no response received
      toast.error('Network error. Please check your connection and try again.', { id: 'network-error', duration: 5000 });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
