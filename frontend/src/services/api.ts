import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Get auth token from localStorage (client-side only)
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Helper function to create headers with auth token
const createHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// ===== Entry-related API calls =====
export interface Entry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  categories: string[];
  tags?: string[];
  mood?: string;
  location?: string;
  wordCount?: number;
  sentimentScore?: number;
}

export interface CreateEntryRequest {
  title: string;
  content: string;
  categories: string[];
  tags?: string[];
  mood?: string;
  location?: string;
}

export interface EntryInsights {
  sentiment: string;
  sentimentScore: number;
  keywords: string[];
  suggestedCategories: string[];
  insights?: string;
  reflections?: string;
  provider: string;
  createdAt: string;
}

// Get all entries
export const getEntries = async () => {
  const response = await axios.get(`${API_URL}/entries`, {
    headers: createHeaders()
  });
  return response.data.items;
};

// Get a specific entry
export const getEntry = async (id: string) => {
  const response = await axios.get(`${API_URL}/entries/${id}`, {
    headers: createHeaders()
  });
  return response.data;
};

// Create a new entry
export const createEntry = async (entry: CreateEntryRequest) => {
  const response = await axios.post(`${API_URL}/entries`, entry, {
    headers: createHeaders()
  });
  return response.data;
};

// Update an entry
export const updateEntry = async (id: string, entry: Partial<CreateEntryRequest>) => {
  const response = await axios.put(`${API_URL}/entries/${id}`, entry, {
    headers: createHeaders()
  });
  return response.data;
};

// Delete an entry
export const deleteEntry = async (id: string) => {
  const response = await axios.delete(`${API_URL}/entries/${id}`, {
    headers: createHeaders()
  });
  return response.data;
};

// Get AI insights for an entry
export const getEntryInsights = async (id: string) => {
  const response = await axios.get(`${API_URL}/entries/${id}/insights`, {
    headers: createHeaders()
  });
  return response.data;
};

// ===== Prompt-related API calls =====
export interface Prompt {
  id: string;
  text: string;
  category: string;
  createdAt: string;
  tags?: string[];
  generated?: boolean;
}

export interface GeneratePromptRequest {
  category: string;
  themes?: string[];
  mood?: string;
  count?: number;
}

// Get random prompt
export const getRandomPrompt = async () => {
  const response = await axios.get(`${API_URL}/prompts/random`, {
    headers: createHeaders()
  });
  // API route returns response.data directly, which may contain { prompt: ... } or be the prompt itself
  return response.data.prompt ? response.data : { prompt: response.data };
};

// Get daily prompt
export const getDailyPrompt = async () => {
  const response = await axios.get(`${API_URL}/prompts/daily`, {
    headers: createHeaders()
  });
  // API route returns response.data directly, which may contain { prompt: ... } or be the prompt itself
  return response.data.prompt ? response.data : { prompt: response.data };
};

// Get prompts by category
export const getPromptsByCategory = async (category: string) => {
  const response = await axios.get(`${API_URL}/prompts/category/${category}`, {
    headers: createHeaders()
  });
  return response.data.prompts;
};

// Generate AI prompts
export const generatePrompts = async (request: GeneratePromptRequest) => {
  const response = await axios.post(`${API_URL}/prompts/generate`, request, {
    headers: createHeaders()
  });
  return response.data.prompts;
};

// ===== Analytics-related API calls =====
export interface AnalyticsTrends {
  moodTrends: { [date: string]: number };
  topKeywords: { keyword: string; count: number }[];
  entryCounts: { [date: string]: number };
  averageSentiment: number;
}

// Get analytics trends
export const getAnalyticsTrends = async (startDate?: string, endDate?: string) => {
  let url = `${API_URL}/analytics/trends`;
  
  if (startDate || endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    url += `?${params.toString()}`;
  }
  
  const response = await axios.get(url, {
    headers: createHeaders()
  });
  return response.data;
}; 