import axios from 'axios';
// Use the internal axios types directly
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getAuthSession, getAccessToken } from '@/lib/auth-utils';

// Create a custom type that includes interceptors
interface EnhancedAxiosInstance extends AxiosInstance {
  interceptors: {
    request: any;
    response: any;
  };
}

// Create base API client
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
}) as EnhancedAxiosInstance;

// Add authentication interceptor
apiClient.interceptors.request.use(async (config: AxiosRequestConfig) => {
  const session = await getAuthSession();
  const token = getAccessToken(session);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    // Handle 401 unauthorized errors (refresh token or redirect to login)
    if (error.response?.status === 401) {
      // Redirect to login page or refresh token
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient; 