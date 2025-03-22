import { NextResponse } from 'next/server';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getAuthSession, getAccessToken, isAuthenticated } from './auth-utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiRequestOptions {
  requireAuth?: boolean;
}

/**
 * Makes an authenticated API request to the backend
 */
export async function apiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  options: ApiRequestOptions = { requireAuth: true }
): Promise<AxiosResponse<T>> {
  // Get session if authentication is required
  if (options.requireAuth) {
    const session = await getAuthSession();
    if (!isAuthenticated(session)) {
      throw new Error('Unauthorized');
    }
    
    const token = getAccessToken(session);
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const url = `${API_URL}${endpoint}`;
    
    switch (method) {
      case 'GET':
        return axios.get<T>(url, config);
      case 'POST':
        return axios.post<T>(url, data, config);
      case 'PUT':
        return axios.put<T>(url, data, config);
      case 'DELETE':
        return axios.delete<T>(url, config);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  } else {
    // Non-authenticated request
    const url = `${API_URL}${endpoint}`;
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    switch (method) {
      case 'GET':
        return axios.get<T>(url, config);
      case 'POST':
        return axios.post<T>(url, data, config);
      case 'PUT':
        return axios.put<T>(url, data, config);
      case 'DELETE':
        return axios.delete<T>(url, config);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }
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
    
    // Return original error data and status if available
    return NextResponse.json(
      { error: axiosError.response?.data || axiosError.message },
      { status: axiosError.response?.status || 500 }
    );
  }
  
  // For non-Axios errors
  return NextResponse.json({ error: defaultMessage }, { status: 500 });
} 