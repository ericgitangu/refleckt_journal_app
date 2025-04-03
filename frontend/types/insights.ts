export type InsightType =
  | "theme"
  | "pattern"
  | "mood"
  | "suggestion"
  | "summary";

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
  period: "week" | "month" | "year";
  themes: string[];
  mood_trend: string;
  highlights: Insight[];
  generated_at: string;
}

/**
 * Type for specific AI insights related to an entry
 */
export interface EntryInsight {
  entryId: string;
  sentiment: string;
  sentimentScore: number;
  keywords: string[];
  suggestedCategories: string[];
  insights?: string;
  reflections?: string;
  provider: string;
  createdAt: string;
  // Cache metadata
  _timestamp?: number;
  _expiresAt?: number;
}

/**
 * Type for topic analysis
 */
export interface Topic {
  name: string;
  confidence: number;
  relatedTerms: string[];
}

/**
 * Type for sentiment analysis
 */
export interface SentimentScore {
  score: number;
  label: string; // positive, negative, neutral
  confidence: number;
}

/**
 * Type for aggregated insights across multiple entries
 */
export interface AggregatedInsights {
  period: string;
  topTopics: Topic[];
  overallSentiment: SentimentScore;
  writingPatterns: {
    averageWordCount: number;
    frequentWords: string[];
    writingTimes: Record<string, number>;
  };
  recommendations: string[];
}
