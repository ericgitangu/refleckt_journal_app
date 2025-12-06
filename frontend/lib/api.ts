import { getSession } from "next-auth/react";
import axios, { AxiosRequestConfig, AxiosError, AxiosResponse } from "axios";
import {
  HealthCheckResponse,
  Session as CustomSession,
  JournalEntry,
  Category,
  Settings,
  Analytics,
} from "@/types/api";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
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
    this.name = "ApiError";
  }
}

// Initialize axios instance - now pointing to our Next.js API routes
const apiClient = axios.create({
  baseURL: "/api", // Using relative URL to hit our Next.js API routes
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Helper function to create authenticated request headers
 */
async function createAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const session = await getSession();
    if (session?.user?.accessToken) {
      headers["Authorization"] = `Bearer ${session.user.accessToken}`;
    }
  } catch (error) {
    console.error("Error setting auth header:", error);
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
      console.error("Authentication error - redirecting to login");
      // Could add logic to redirect or refresh token here
    }

    throw new ApiError(
      `API request failed: ${error.message}`,
      error.response?.status || 500,
    );
  }

  throw new ApiError(
    `API request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    500,
  );
}

/**
 * Case conversion utility functions for seamless backend/frontend communication
 */

// Convert camelCase to snake_case
function camelToSnakeCase(key: string): string {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

// Convert snake_case to camelCase
function snakeToCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively converts object keys from camelCase to snake_case
 * Handles nested objects and arrays
 */
export function camelToSnake<T = any>(data: T): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => camelToSnake(item));
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      const snakeKey = camelToSnakeCase(key);
      result[snakeKey] = camelToSnake(value);
    }
    
    return result;
  }

  return data;
}

/**
 * Recursively converts object keys from snake_case to camelCase
 * Handles nested objects and arrays
 */
export function snakeToCamel<T = any>(data: any): T {
  if (data === null || data === undefined) {
    return data as T;
  }

  if (Array.isArray(data)) {
    return data.map(item => snakeToCamel(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      const camelKey = snakeToCamelCase(key);
      result[camelKey] = snakeToCamel(value);
    }
    
    return result as T;
  }

  return data as T;
}

/**
 * Custom mapper function type to handle special field transformations
 */
export type FieldMapper<T, U> = (value: T) => U;

/**
 * Interface for defining special field mappings between frontend and backend
 */
export interface FieldMapping {
  // Maps a frontend camelCase field to a backend snake_case field
  frontend: string;
  backend: string;
  // Optional custom mappers for transforming values beyond simple casing
  toBackend?: FieldMapper<any, any>; 
  toFrontend?: FieldMapper<any, any>;
}

/**
 * Converts an object with special field transformations that go beyond case conversion
 * @param data The data to transform
 * @param mappings The special field mappings to apply
 * @param direction 'toBackend' or 'toFrontend'
 */
export function transformWithMappings<T = any, U = any>(
  data: T,
  mappings: FieldMapping[],
  direction: 'toBackend' | 'toFrontend'
): U {
  if (!data || typeof data !== 'object') {
    return data as unknown as U;
  }

  // First do regular case conversion
  const baseTransformed = direction === 'toBackend' 
    ? camelToSnake(data) 
    : snakeToCamel(data);
    
  // Then apply special field mappings
  const result = { ...baseTransformed };
  
  mappings.forEach(mapping => {
    const { frontend, backend } = mapping;
    
    if (direction === 'toBackend') {
      if (frontend in (data as Record<string, any>)) {
        // Delete the camelCase key that was already converted by camelToSnake
        delete result[camelToSnakeCase(frontend)];
        
        // Apply custom transformation or direct value assignment
        const value = (data as Record<string, any>)[frontend];
        result[backend] = mapping.toBackend ? mapping.toBackend(value) : value;
      }
    } else { // toFrontend
      if (backend in baseTransformed) {
        // Delete the automatically converted key
        delete result[snakeToCamelCase(backend)];
        
        // Apply custom transformation or direct value assignment
        const value = baseTransformed[backend];
        result[frontend] = mapping.toFrontend ? mapping.toFrontend(value) : value;
      }
    }
  });
  
  return result as U;
}

/**
 * Enhanced API client that handles case conversion and special field mappings
 */
export async function fetchApiWithMapping<T>(
  endpoint: string,
  options: ApiOptions = {},
  mappings: FieldMapping[] = []
): Promise<T> {
  const { method = "GET", body, headers: customHeaders = {} } = options;
  
  // Convert request body with special mappings if needed
  const convertedBody = body 
    ? (mappings.length > 0 ? transformWithMappings(body, mappings, 'toBackend') : camelToSnake(body)) 
    : undefined;
  
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
      data: convertedBody,
    };

    // Check for offline status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn("Offline mode - attempting to use cached data");
      // Could implement offline caching strategy here
    }

    const response = await apiClient(config);
    
    // Convert response data with special mappings if provided
    return mappings.length > 0 
      ? transformWithMappings<any, T>(response.data, mappings, 'toFrontend')
      : snakeToCamel<T>(response.data);
  } catch (error) {
    return handleApiError(error);
  }
}

// Example usage with mappings - for a hypothetical endpoint with schema differences
// This is an example that could be implemented for specific API scenarios
/*
const insightsFieldMappings: FieldMapping[] = [
  { 
    frontend: 'sentimentScore', 
    backend: 'sentiment_analysis_result',
    // Custom mappings for more complex transformations
    toFrontend: (value: any) => ({ score: value.score, label: value.category }),
    toBackend: (value: any) => ({ score: value.score, category: value.label })
  },
  {
    frontend: 'topicsList',
    backend: 'extracted_topics',
    // Simple array transformation
    toFrontend: (value: string[]) => value.map(v => v.toLowerCase()),
    toBackend: (value: string[]) => value.map(v => v.toUpperCase())
  }
];

// Could be used like this:
// fetchApiWithMapping<EntryInsights>(`/entries/${id}/insights`, {}, insightsFieldMappings)
*/

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
  getAll: () => fetchApiWithMapping<JournalEntry[]>("/entries"),
  getById: (id: string) => fetchApiWithMapping<JournalEntry>(`/entries/${id}`),
  create: (data: EntryCreateData) =>
    fetchApiWithMapping<JournalEntry>("/entries", {
      method: "POST",
      body: data,
    }),
  update: (id: string, data: EntryUpdateData) =>
    fetchApiWithMapping<JournalEntry>(`/entries/${id}`, {
      method: "PUT",
      body: data,
    }),
  delete: (id: string) =>
    fetchApiWithMapping<void>(`/entries/${id}`, {
      method: "DELETE",
    }),
  search: (query: string) =>
    fetchApiWithMapping<JournalEntry[]>(`/entries/search?q=${encodeURIComponent(query)}`),
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
  getCategories: () => fetchApiWithMapping<Category[]>("/settings/categories"),
  createCategory: (data: CategoryCreateData) =>
    fetchApiWithMapping<Category>("/settings/categories", {
      method: "POST",
      body: data,
    }),
  updateCategory: (id: string, data: CategoryUpdateData) =>
    fetchApiWithMapping<Category>(`/settings/categories/${id}`, {
      method: "PUT",
      body: data,
    }),
  deleteCategory: (id: string) =>
    fetchApiWithMapping<void>(`/settings/categories/${id}`, {
      method: "DELETE",
    }),
  getSettings: () => fetchApiWithMapping<Settings>("/settings"),
  updateSettings: (data: SettingsUpdateData) =>
    fetchApiWithMapping<Settings>("/settings", {
      method: "PUT",
      body: data,
    }),
};

// Analytics API types and functions
export const analyticsApi = {
  getAll: () => fetchApiWithMapping<Analytics>("/analytics"),
  requestAnalysis: () =>
    fetchApiWithMapping<{ status: string; job_id: string }>("/analytics", {
      method: "POST",
    }),
  getMood: () =>
    fetchApiWithMapping<{ moods: Array<{ date: string; value: number }> }>(
      "/analytics/mood",
    ),
};

// Health check API
export const healthApi = {
  checkServices: () => fetchApiWithMapping<HealthCheckResponse>("/health"),
  checkService: (service: string) =>
    fetchApiWithMapping<HealthCheckResponse>(`/health/${service}`),
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
  getAll: () => fetchApiWithMapping<{ prompts: Prompt[] }>("/prompts"),
  getById: (id: string) => fetchApiWithMapping<{ prompt: Prompt }>(`/prompts/${id}`),
  getDaily: () => fetchApiWithMapping<{ prompt: Prompt }>("/prompts/daily"),
  getRandom: () => fetchApiWithMapping<{ prompt: Prompt }>("/prompts/random"),
  getByCategory: (category: string) =>
    fetchApiWithMapping<{ prompts: Prompt[] }>(
      `/prompts/category/${encodeURIComponent(category)}`,
    ),
  create: (data: PromptCreateData) =>
    fetchApiWithMapping<{ prompt: Prompt }>("/prompts", {
      method: "POST",
      body: data,
    }),
  update: (id: string, data: PromptUpdateData) =>
    fetchApiWithMapping<{ prompt: Prompt }>(`/prompts/${id}`, {
      method: "PUT",
      body: data,
    }),
  delete: (id: string) =>
    fetchApiWithMapping<void>(`/prompts/${id}`, {
      method: "DELETE",
    }),
};

// AI API types and functions
// Note: These types match the backend ai-service response structure

export interface EntryInsight {
  entryId: string;
  sentiment: string;  // positive, negative, neutral
  sentimentScore: number;  // -1.0 to 1.0
  keywords: string[];
  suggestedCategories: string[];
  insights?: string;
  reflections?: string;
  provider: string;  // openai, anthropic
  createdAt: string;
}

export interface GeneratedPrompt {
  text: string;
  category: string;
  basedOn: string[];
  authorStyle: string;
  createdAt: string;
}

// Special field mappings for AI-specific endpoints
// Maps between frontend camelCase and backend snake_case for AI insights
const insightsMappings: FieldMapping[] = [
  {
    frontend: 'entryId',
    backend: 'entry_id'
  },
  {
    frontend: 'sentimentScore',
    backend: 'sentiment_score'
  },
  {
    frontend: 'suggestedCategories',
    backend: 'suggested_categories'
  },
  {
    frontend: 'createdAt',
    backend: 'created_at'
  }
];

const promptGenerationMappings: FieldMapping[] = [
  {
    frontend: 'basedOn',
    backend: 'based_on_entries'
  },
  {
    frontend: 'authorStyle',
    backend: 'style_preference'
  }
];

// Add AI endpoints to entriesApi
export const aiApi = {
  // Get AI insights for an entry
  getEntryInsights: (entryId: string) =>
    fetchApiWithMapping<EntryInsight>(
      `/entries/${entryId}/insights`,
      {},
      insightsMappings
    ),
  
  // Get insights for multiple entries
  getBatchInsights: (entryIds: string[]) =>
    fetchApiWithMapping<EntryInsight[]>(
      `/entries/insights/batch`,
      {
        method: 'POST',
        body: { entry_ids: entryIds }
      },
      insightsMappings
    ),
  
  // Generate a new journal prompt based on preferences
  generatePrompt: (options: {
    category?: string;
    basedOn?: string[];
    authorStyle?: string;
  }) =>
    fetchApiWithMapping<GeneratedPrompt>(
      `/prompts/generate`,
      {
        method: 'POST',
        body: options
      },
      promptGenerationMappings
    ),
  
  // Generate multiple prompts
  generatePromptBatch: (options: {
    count: number;
    category?: string;
    basedOn?: string[];
    authorStyle?: string;
  }) =>
    fetchApiWithMapping<GeneratedPrompt[]>(
      `/prompts/generate/batch`,
      {
        method: 'POST',
        body: options
      },
      promptGenerationMappings
    ),
  
  // Handle errors more gracefully with retries and fallbacks
  getEntryInsightsWithFallback: async (entryId: string): Promise<EntryInsight | null> => {
    try {
      return await fetchApiWithMapping<EntryInsight>(
        `/entries/${entryId}/insights`,
        {},
        insightsMappings
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 503) {
        console.warn('AI service unavailable, using cached insights if available');
        // Could implement cache retrieval here
        return null;
      }
      throw error;
    }
  }
};
