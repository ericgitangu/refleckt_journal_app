import apiClient from './client';
import { Insight, InsightType } from '@/types/insights';

export const insightsApi = {
  // Get insights for a specific entry
  getEntryInsights: async (id: string) => {
    const response = await apiClient.get(`/insights/entries/${id}`);
    return response.data;
  },
  
  // Get all insights for the user
  getAllInsights: async (type?: InsightType) => {
    const params = type ? { type } : undefined;
    const response = await apiClient.get('/insights', { params });
    return response.data;
  },
  
  // Get periodic summary of insights (weekly, monthly)
  getSummary: async (period: 'week' | 'month' | 'year') => {
    const response = await apiClient.get('/insights/summary', { 
      params: { period } 
    });
    return response.data;
  },
  
  // Request analysis for a specific entry
  requestAnalysis: async (id: string) => {
    const response = await apiClient.post(`/insights/analyze/${id}`);
    return response.data;
  }
}; 