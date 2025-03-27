export interface WritingStats {
  current_streak: number;
  longest_streak: number;
  entries_count: number;
  total_words: number;
  avg_words_per_entry: number;
  most_productive_day: string;
  most_used_tags: TagCount[];
  mood_distribution: Record<string, number>;
  writing_time_distribution: Record<string, number>; // Hour of day
}

export interface MoodDistribution {
  period: 'week' | 'month' | 'year';
  distribution: {
    date: string;
    moods: Record<string, number>;
  }[];
} 