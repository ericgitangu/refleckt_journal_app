import { Session } from 'next-auth';
import { ApiError } from '../api';

interface ServerApiClientOptions {
  baseURL?: string;
  timeout?: number;
}

interface ServerApiClientResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

interface ApiClient {
  get: <T>(url: string, headers?: Record<string, string>) => Promise<ServerApiClientResponse<T>>;
  post: <T>(url: string, data?: any, headers?: Record<string, string>) => Promise<ServerApiClientResponse<T>>;
  put: <T>(url: string, data?: any, headers?: Record<string, string>) => Promise<ServerApiClientResponse<T>>;
  delete: <T>(url: string, headers?: Record<string, string>) => Promise<ServerApiClientResponse<T>>;
}

/**
 * Creates an authenticated API client for use in server components/API routes
 */
export function createServerComponentClient(
  session: Session | null,
  options: ServerApiClientOptions = {}
): ApiClient {
  // Get the API URL from environment variables
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
  const baseURL = options.baseURL || apiBaseUrl;
  
  // Default headers with auth if available
  const getHeaders = (customHeaders: Record<string, string> = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };
    
    if (session?.user?.accessToken) {
      headers['Authorization'] = `Bearer ${session.user.accessToken}`;
    }
    
    return headers;
  };
  
  // Create fetch wrapper with error handling
  const fetchWithErrorHandling = async <T>(
    url: string, 
    options: RequestInit
  ): Promise<ServerApiClientResponse<T>> => {
    try {
      const response = await fetch(`${baseURL}${url}`, {
        ...options,
        headers: new Headers(options.headers as Record<string, string>)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          errorText || response.statusText,
          response.status
        );
      }
      
      const data = await response.json();
      
      return {
        data,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        500
      );
    }
  };
  
  // Return API client interface
  return {
    get: <T>(url: string, headers?: Record<string, string>) => 
      fetchWithErrorHandling<T>(url, { 
        method: 'GET',
        headers: getHeaders(headers)
      }),
      
    post: <T>(url: string, data?: any, headers?: Record<string, string>) => 
      fetchWithErrorHandling<T>(url, {
        method: 'POST',
        headers: getHeaders(headers),
        body: data ? JSON.stringify(data) : undefined
      }),
      
    put: <T>(url: string, data?: any, headers?: Record<string, string>) => 
      fetchWithErrorHandling<T>(url, {
        method: 'PUT',
        headers: getHeaders(headers),
        body: data ? JSON.stringify(data) : undefined
      }),
      
    delete: <T>(url: string, headers?: Record<string, string>) => 
      fetchWithErrorHandling<T>(url, {
        method: 'DELETE',
        headers: getHeaders(headers)
      })
  };
}

/**
 * Creates an API client for use in Next.js API routes
 * @param accessToken JWT access token
 */
export function createApiRouteClient(
  accessToken?: string,
  options: ServerApiClientOptions = {}
): ApiClient {
  // Get the API URL from environment variables
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
  const baseURL = options.baseURL || apiBaseUrl;
  
  // Default headers with auth if available
  const getHeaders = (customHeaders: Record<string, string> = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    return headers;
  };
  
  // Create fetch wrapper with error handling
  const fetchWithErrorHandling = async <T>(
    url: string, 
    options: RequestInit
  ): Promise<ServerApiClientResponse<T>> => {
    try {
      const response = await fetch(`${baseURL}${url}`, {
        ...options,
        headers: new Headers(options.headers as Record<string, string>)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          errorText || response.statusText,
          response.status
        );
      }
      
      const data = await response.json();
      
      return {
        data,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        500
      );
    }
  };
  
  // Return API client interface
  return {
    get: <T>(url: string, headers?: Record<string, string>) => 
      fetchWithErrorHandling<T>(url, { 
        method: 'GET',
        headers: getHeaders(headers)
      }),
      
    post: <T>(url: string, data?: any, headers?: Record<string, string>) => 
      fetchWithErrorHandling<T>(url, {
        method: 'POST',
        headers: getHeaders(headers),
        body: data ? JSON.stringify(data) : undefined
      }),
      
    put: <T>(url: string, data?: any, headers?: Record<string, string>) => 
      fetchWithErrorHandling<T>(url, {
        method: 'PUT',
        headers: getHeaders(headers),
        body: data ? JSON.stringify(data) : undefined
      }),
      
    delete: <T>(url: string, headers?: Record<string, string>) => 
      fetchWithErrorHandling<T>(url, {
        method: 'DELETE',
        headers: getHeaders(headers)
      })
  };
} 