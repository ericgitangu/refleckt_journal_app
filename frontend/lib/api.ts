import { getSession } from 'next-auth/react';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { HealthCheckResponse, Session as CustomSession } from '@/types/api';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  cache?: RequestCache;
  tags?: string[];
}

export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Initialize axios instance - now pointing to our Next.js API routes
const apiClient = axios.create({
  baseURL: '/api', // Using relative URL to hit our Next.js API routes
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

/**
 * Base API client for interacting with our Next.js API routes
 * The Next.js API routes will handle authentication with the backend
 */
export async function fetchApi<T>(
  endpoint: string, 
  options: ApiOptions = {}
): Promise<T> {
  const { 
    method = 'GET',
    body,
    headers = {},
  } = options;
  
  // Prepare request config
  const config: AxiosRequestConfig = {
    method,
    url: endpoint,
    headers: {
      ...headers,
    },
    data: body,
  };

  try {
    const response = await apiClient(config);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      throw new ApiError(
        `API request failed: ${axiosError.message}`,
        axiosError.response?.status || 500
      );
    }
    
    throw new ApiError(
      `API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

// Service-specific API functions
export const entriesApi = {
  getAll: () => fetchApi<any[]>('/entries'),
  getById: (id: string) => fetchApi<any>(`/entries/${id}`),
  create: (data: any) => fetchApi<any>('/entries', { 
    method: 'POST', 
    body: data 
  }),
  update: (id: string, data: any) => fetchApi<any>(`/entries/${id}`, { 
    method: 'PUT', 
    body: data 
  }),
  delete: (id: string) => fetchApi<void>(`/entries/${id}`, { 
    method: 'DELETE' 
  }),
  search: (query: string) => fetchApi<any[]>(`/entries/search?q=${encodeURIComponent(query)}`)
};

export const settingsApi = {
  getCategories: () => fetchApi<any[]>('/settings/categories'),
  createCategory: (data: any) => fetchApi<any>('/settings/categories', { 
    method: 'POST', 
    body: data 
  }),
  updateCategory: (id: string, data: any) => fetchApi<any>(`/settings/categories/${id}`, { 
    method: 'PUT', 
    body: data 
  }),
  deleteCategory: (id: string) => fetchApi<void>(`/settings/categories/${id}`, { 
    method: 'DELETE' 
  }),
  getSettings: () => fetchApi<any>('/settings'),
  updateSettings: (data: any) => fetchApi<any>('/settings', { 
    method: 'PUT', 
    body: data 
  })
};

export const analyticsApi = {
  getAll: () => fetchApi<any>('/analytics'),
  requestAnalysis: () => fetchApi<any>('/analytics', { 
    method: 'POST' 
  }),
  getMood: () => fetchApi<any>('/analytics/mood')
};

// Health check API
export const healthApi = {
  checkServices: () => fetchApi<HealthCheckResponse>('/health'),
  checkService: (service: string) => fetchApi<HealthCheckResponse>(`/health/${service}`)
}; 