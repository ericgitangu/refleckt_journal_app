import { getSession } from 'next-auth/react';
import axios, { AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { HealthCheckResponse, Session as CustomSession, JournalEntry, Category, Settings, Analytics } from '@/types/api';

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
 * Helper function to create authenticated request headers
 */
async function createAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  try {
    const session = await getSession();
    if (session?.user?.accessToken) {
      headers['Authorization'] = `Bearer ${session.user.accessToken}`;
    }
  } catch (error) {
    console.error('Error setting auth header:', error);
  }
  
  return headers;
}

/**
 * Handle API error responses
 */
function handleApiError(error: unknown): never {
  // Handle specific error cases
  if (axios.isAxiosError(error)) {
    // For 401 errors, we could trigger a session refresh or redirect to login
    if (error.response?.status === 401) {
      console.error('Authentication error - redirecting to login');
      // Could add logic to redirect or refresh token here
    }
    
    throw new ApiError(
      `API request failed: ${error.message}`,
      error.response?.status || 500
    );
  }
  
  throw new ApiError(
    `API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    500
  );
}

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
    headers: customHeaders = {},
  } = options;
  
  try {
    // Get authentication headers
    const authHeaders = await createAuthHeaders();
    
    // Prepare request config
    const config: AxiosRequestConfig = {
      method,
      url: endpoint,
      headers: {
        ...authHeaders,
        ...customHeaders,
      },
      data: body,
    };

    // Check for offline status
    if (!navigator.onLine) {
      console.warn('Offline mode - attempting to use cached data');
      // Could implement offline caching strategy here
    }

    const response = await apiClient(config);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

// Type-safe service-specific API functions

// Entry API types and functions
export interface EntryCreateData {
  title: string;
  content: string;
  mood?: number;
  category_id?: string;
}

export interface EntryUpdateData {
  title?: string;
  content?: string;
  mood?: number;
  category_id?: string;
}

export const entriesApi = {
  getAll: () => fetchApi<JournalEntry[]>('/entries'),
  getById: (id: string) => fetchApi<JournalEntry>(`/entries/${id}`),
  create: (data: EntryCreateData) => fetchApi<JournalEntry>('/entries', { 
    method: 'POST', 
    body: data 
  }),
  update: (id: string, data: EntryUpdateData) => fetchApi<JournalEntry>(`/entries/${id}`, { 
    method: 'PUT', 
    body: data 
  }),
  delete: (id: string) => fetchApi<void>(`/entries/${id}`, { 
    method: 'DELETE' 
  }),
  search: (query: string) => fetchApi<JournalEntry[]>(`/entries/search?q=${encodeURIComponent(query)}`)
};

// Settings API types and functions
export interface CategoryCreateData {
  name: string;
  color?: string;
}

export interface CategoryUpdateData {
  name?: string;
  color?: string;
}

export interface SettingsUpdateData {
  theme?: string;
  notifications_enabled?: boolean;
  ai_analysis_enabled?: boolean;
}

export const settingsApi = {
  getCategories: () => fetchApi<Category[]>('/settings/categories'),
  createCategory: (data: CategoryCreateData) => fetchApi<Category>('/settings/categories', { 
    method: 'POST', 
    body: data 
  }),
  updateCategory: (id: string, data: CategoryUpdateData) => fetchApi<Category>(`/settings/categories/${id}`, { 
    method: 'PUT', 
    body: data 
  }),
  deleteCategory: (id: string) => fetchApi<void>(`/settings/categories/${id}`, { 
    method: 'DELETE' 
  }),
  getSettings: () => fetchApi<Settings>('/settings'),
  updateSettings: (data: SettingsUpdateData) => fetchApi<Settings>('/settings', { 
    method: 'PUT', 
    body: data 
  })
};

// Analytics API types and functions
export const analyticsApi = {
  getAll: () => fetchApi<Analytics>('/analytics'),
  requestAnalysis: () => fetchApi<{ status: string; job_id: string }>('/analytics', { 
    method: 'POST' 
  }),
  getMood: () => fetchApi<{ moods: Array<{ date: string; value: number }> }>('/analytics/mood')
};

// Health check API
export const healthApi = {
  checkServices: () => fetchApi<HealthCheckResponse>('/health'),
  checkService: (service: string) => fetchApi<HealthCheckResponse>(`/health/${service}`)
};

// Prompt API types and functions
export interface Prompt {
  id: string;
  text: string;
  category: string;
  created_at: string;
  tags?: string[];
}

export interface PromptCreateData {
  text: string;
  category: string;
  tags?: string[];
}

export interface PromptUpdateData {
  text?: string;
  category?: string;
  tags?: string[];
}

export const promptsApi = {
  getAll: () => fetchApi<{ prompts: Prompt[] }>('/prompts'),
  getById: (id: string) => fetchApi<{ prompt: Prompt }>(`/prompts/${id}`),
  getDaily: () => fetchApi<{ prompt: Prompt }>('/prompts/daily'),
  getRandom: () => fetchApi<{ prompt: Prompt }>('/prompts/random'),
  getByCategory: (category: string) => fetchApi<{ prompts: Prompt[] }>(`/prompts/category/${encodeURIComponent(category)}`),
  create: (data: PromptCreateData) => fetchApi<{ prompt: Prompt }>('/prompts', { 
    method: 'POST', 
    body: data 
  }),
  update: (id: string, data: PromptUpdateData) => fetchApi<{ prompt: Prompt }>(`/prompts/${id}`, { 
    method: 'PUT', 
    body: data 
  }),
  delete: (id: string) => fetchApi<void>(`/prompts/${id}`, { 
    method: 'DELETE' 
  })
}; 