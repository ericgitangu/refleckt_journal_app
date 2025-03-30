import { apiClient } from '@/lib/api-client';
import { fetchWithMockFallback } from '@/lib/mock-utils';

// Analytics data interface
export interface AnalyticsData {
  entry_count: number;
  entry_frequency: Array<{date: string; count: number}>;
  category_distribution: Array<{category: string; count: number; percentage: number}>;
  mood_trends: Array<{date: string; average_sentiment: number; entry_count: number}>;
  writing_patterns: Array<{hour_of_day: number; count: number}>;
  word_count_average: number;
  top_keywords: string[];
  longest_streak_days: number;
  current_streak_days: number;
}

// Mock analytics data
const mockAnalyticsData: AnalyticsData = {
  entry_count: 15,
  entry_frequency: [
    { date: '2023-03-24', count: 1 },
    { date: '2023-03-25', count: 2 },
    { date: '2023-03-26', count: 0 },
    { date: '2023-03-27', count: 1 },
    { date: '2023-03-28', count: 3 },
    { date: '2023-03-29', count: 2 },
    { date: '2023-03-30', count: 1 },
  ],
  category_distribution: [
    { category: 'Personal', count: 6, percentage: 40 },
    { category: 'Work', count: 4, percentage: 26.7 },
    { category: 'Ideas', count: 3, percentage: 20 },
    { category: 'Health', count: 2, percentage: 13.3 },
  ],
  mood_trends: [
    { date: '2023-03-24', average_sentiment: 0.7, entry_count: 1 },
    { date: '2023-03-25', average_sentiment: 0.5, entry_count: 2 },
    { date: '2023-03-26', average_sentiment: 0, entry_count: 0 },
    { date: '2023-03-27', average_sentiment: 0.2, entry_count: 1 },
    { date: '2023-03-28', average_sentiment: 0.8, entry_count: 3 },
    { date: '2023-03-29', average_sentiment: 0.6, entry_count: 2 },
    { date: '2023-03-30', average_sentiment: 0.4, entry_count: 1 },
  ],
  writing_patterns: [
    { hour_of_day: 7, count: 1 },
    { hour_of_day: 9, count: 2 },
    { hour_of_day: 12, count: 1 },
    { hour_of_day: 16, count: 3 },
    { hour_of_day: 19, count: 2 },
    { hour_of_day: 22, count: 6 },
  ],
  word_count_average: 245,
  top_keywords: ['work', 'meeting', 'ideas', 'health', 'running', 'family', 'books', 'project', 'sleep', 'goals'],
  longest_streak_days: 6,
  current_streak_days: 4,
};

/**
 * Get analytics summary data
 * @param timePeriod The time period to get analytics for (day, week, month, year)
 * @param useMock Force using mock data regardless of environment setting
 */
export async function getAnalyticsSummary(timePeriod: string = 'month', useMock: boolean = false): Promise<AnalyticsData> {
  return fetchWithMockFallback({
    useMock,
    mockData: mockAnalyticsData,
    fetch: async () => {
      return await apiClient<AnalyticsData>(`/api/analytics?time_period=${timePeriod}`);
    }
  });
} 