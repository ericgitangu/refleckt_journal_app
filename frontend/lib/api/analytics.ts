import apiClient from './client';
import { WritingStats, MoodDistribution } from '@/types/analytics';

export const analyticsApi = {
  // Get writing statistics
  getWritingStats: async (period: 'week' | 'month' | 'year' | 'all' = 'month') => {
    const response = await apiClient.get('/analytics/writing-stats', { 
      params: { period } 
    });
    return response.data as WritingStats;
  },
  
  // Get mood distribution over time
  getMoodDistribution: async (period: 'week' | 'month' | 'year' = 'month') => {
    const response = await apiClient.get('/analytics/mood', { 
      params: { period } 
    });
    return response.data as MoodDistribution;
  },
  
  // Get current and longest streaks
  getStreaks: async () => {
    const response = await apiClient.get('/analytics/streaks');
    return response.data;
  }
}; 