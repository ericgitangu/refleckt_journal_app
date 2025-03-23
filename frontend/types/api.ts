import { AxiosResponse, AxiosError as AxiosErrorType } from 'axios';

// Health check types
export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  message?: string;
}

export interface HealthCheckResponse {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceStatus[];
}

// Entry types
export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  category_id?: string;
  created_at: string;
  updated_at: string;
  mood?: string;
  tags?: string[];
}

// Category types
export interface Category {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

// Settings types
export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  reminder_enabled: boolean;
  reminder_time?: string;
  created_at: string;
  updated_at: string;
}

// Alias for the client-side API
export type Settings = UserSettings;

// Analytics types
export interface AnalyticsData {
  id: string;
  total_entries: number;
  top_categories: { name: string; count: number }[];
  mood_distribution: { mood: string; count: number }[];
  activity_by_day: { day: string; count: number }[];
  created_at: string;
  updated_at: string;
}

// Alias for the client-side API
export type Analytics = AnalyticsData;

export interface MoodData {
  id: string;
  entry_id: string;
  mood: string;
  confidence: number;
  created_at: string;
}

// Auth types
export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  accessToken?: string;
}

export interface Session {
  user?: User;
  expires: string;
}

// For NextAuth
export interface NextAuthUser extends User {
  accessToken: string;
}

export interface JWTToken {
  id: string;
  email: string;
  accessToken: string;
  iat: number;
  exp: number;
}

// Use axios types to avoid import errors
export type AxiosError = AxiosErrorType;
export type { AxiosResponse }; 