import { NextResponse } from 'next/server';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getAuthSession, getAccessToken, isAuthenticated } from './auth-utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const MAX_RETRIES = 2;

interface ApiRequestOptions {
  requireAuth?: boolean;
  retries?: number;
}

/**
 * Makes an authenticated API request to the backend
 */
export async function apiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  options: ApiRequestOptions = { requireAuth: true, retries: MAX_RETRIES }
): Promise<AxiosResponse<T>> {
  const { requireAuth = true, retries = MAX_RETRIES } = options;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add authentication if required
      if (requireAuth) {
        const session = await getAuthSession();
        if (!isAuthenticated(session)) {
          throw new Error('Unauthorized');
        }
        
        const token = getAccessToken(session);
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Configure request
      const url = `${API_URL}${endpoint}`;
      const config: AxiosRequestConfig = { headers };
      
      // Execute request based on method
      switch (method) {
        case 'GET':
          return await axios.get<T>(url, config);
        case 'POST':
          return await axios.post<T>(url, data, config);
        case 'PUT':
          return await axios.put<T>(url, data, config);
        case 'DELETE':
          return await axios.delete<T>(url, config);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    } catch (error) {
      // Only retry on network errors or 5XX errors
      if (
        axios.isAxiosError(error) && 
        (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || 
         !error.response || (error.response.status >= 500 && error.response.status < 600))
      ) {
        if (attempt < retries) {
          // Exponential backoff: 2^attempt * 100ms
          const delay = Math.pow(2, attempt) * 100;
          console.warn(`API request failed, retrying in ${delay}ms...`, { endpoint, method, attempt });
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }
      }
      
      // For auth errors, we might want to trigger a sign-out
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error('Authentication error:', { endpoint, method });
      }
      
      throw error;
    }
  }

  // This should never be reached due to the while loop and error throwing
  throw new Error('Maximum retries exceeded');
}

/**
 * Handle API errors and return appropriate NextResponse
 */
export function handleApiError(error: unknown, defaultMessage = 'An error occurred'): NextResponse {
  console.error('API Error:', error);

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Check for 401 Unauthorized
    if (axiosError.response?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check for 404 Not Found
    if (axiosError.response?.status === 404) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Check for timeout or network error
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return NextResponse.json({ error: 'Request timeout, please try again' }, { status: 504 });
    }
    
    // Return original error data and status if available
    return NextResponse.json(
      { error: axiosError.response?.data || axiosError.message },
      { status: axiosError.response?.status || 500 }
    );
  }
  
  // For non-Axios errors
  return NextResponse.json({ error: defaultMessage }, { status: 500 });
} 