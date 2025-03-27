export type InsightType = 'theme' | 'pattern' | 'mood' | 'suggestion' | 'summary';

export interface Insight {
  id: string;
  user_id: string;
  entry_id?: string;
  type: InsightType;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface InsightSummary {
  period: 'week' | 'month' | 'year';
  themes: string[];
  mood_trend: string;
  highlights: Insight[];
  generated_at: string;
} 