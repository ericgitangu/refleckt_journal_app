// Gamification system types

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
  unlocked_at?: string;
  category: AchievementCategory;
  requirement: number;
  progress?: number;
}

export type AchievementCategory =
  | 'streak'
  | 'entries'
  | 'words'
  | 'insights'
  | 'prompts'
  | 'mood'
  | 'level';

export interface GamificationStats {
  user_id: string;
  tenant_id: string;
  points_balance: number;
  lifetime_points: number;
  level: number;
  level_title: string;
  current_streak: number;
  longest_streak: number;
  last_entry_date: string | null;
  achievements: Achievement[];
  total_entries: number;
  total_words: number;
  insights_requested: number;
  prompts_used: number;
  next_level_points: number;
  points_to_next_level: number;
  created_at: string;
  updated_at: string;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: PointsReason;
  description: string;
  entry_id?: string;
  created_at: string;
}

export type PointsReason =
  | 'entry_created'
  | 'entry_word_bonus'
  | 'streak_continued'
  | 'streak_milestone'
  | 'ai_insights'
  | 'prompt_used'
  | 'achievement_unlocked'
  | 'first_entry_of_day'
  | 'level_up';

export interface LevelInfo {
  level: number;
  title: string;
  min_points: number;
  max_points: number;
}

// Level progression constants
export const LEVEL_THRESHOLDS: LevelInfo[] = [
  { level: 1, title: 'Novice Writer', min_points: 0, max_points: 99 },
  { level: 2, title: 'Journaling Beginner', min_points: 100, max_points: 299 },
  { level: 3, title: 'Regular Reflector', min_points: 300, max_points: 599 },
  { level: 4, title: 'Committed Writer', min_points: 600, max_points: 999 },
  { level: 5, title: 'Dedicated Journalist', min_points: 1000, max_points: 1499 },
  { level: 6, title: 'Mindful Author', min_points: 1500, max_points: 2499 },
  { level: 7, title: 'Reflection Master', min_points: 2500, max_points: 3999 },
  { level: 8, title: 'Journaling Expert', min_points: 4000, max_points: 5999 },
  { level: 9, title: 'Wisdom Seeker', min_points: 6000, max_points: 9999 },
  { level: 10, title: 'Enlightened Scribe', min_points: 10000, max_points: Infinity },
];

// Points allocation constants
export const POINTS_CONFIG = {
  entry_created: 10,
  word_bonus_100: 5,
  word_bonus_300: 10,
  word_bonus_500: 15,
  streak_continued: 15,
  streak_7_days: 50,
  streak_30_days: 200,
  ai_insights: 5,
  prompt_used: 5,
  first_entry_of_day: 5,
} as const;

// Achievement definitions
export const ACHIEVEMENTS_CONFIG: Omit<Achievement, 'unlocked' | 'unlocked_at' | 'progress'>[] = [
  { id: 'first_entry', name: 'First Steps', description: 'Create your first journal entry', icon: 'pencil', points: 10, category: 'entries', requirement: 1 },
  { id: 'streak_3', name: 'Getting Started', description: 'Maintain a 3-day streak', icon: 'flame', points: 25, category: 'streak', requirement: 3 },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'flame', points: 50, category: 'streak', requirement: 7 },
  { id: 'streak_30', name: 'Month Master', description: 'Maintain a 30-day streak', icon: 'flame', points: 200, category: 'streak', requirement: 30 },
  { id: 'streak_100', name: 'Century Club', description: 'Maintain a 100-day streak', icon: 'trophy', points: 500, category: 'streak', requirement: 100 },
  { id: 'entries_10', name: 'Consistent Writer', description: 'Write 10 journal entries', icon: 'book', points: 50, category: 'entries', requirement: 10 },
  { id: 'entries_50', name: 'Dedicated Journaler', description: 'Write 50 journal entries', icon: 'book', points: 150, category: 'entries', requirement: 50 },
  { id: 'entries_100', name: 'Prolific Author', description: 'Write 100 journal entries', icon: 'library', points: 300, category: 'entries', requirement: 100 },
  { id: 'words_500', name: 'Wordsmith', description: 'Write a 500+ word entry', icon: 'type', points: 25, category: 'words', requirement: 500 },
  { id: 'words_1000', name: 'Novelist', description: 'Write a 1000+ word entry', icon: 'book-open', points: 50, category: 'words', requirement: 1000 },
  { id: 'insights_5', name: 'Self-Aware', description: 'Request 5 AI insights', icon: 'sparkles', points: 25, category: 'insights', requirement: 5 },
  { id: 'insights_20', name: 'Deep Thinker', description: 'Request 20 AI insights', icon: 'brain', points: 75, category: 'insights', requirement: 20 },
  { id: 'prompts_10', name: 'Prompt Explorer', description: 'Use 10 writing prompts', icon: 'message-square', points: 40, category: 'prompts', requirement: 10 },
  { id: 'mood_positive', name: 'Optimist', description: 'Write 5 entries with positive mood', icon: 'smile', points: 30, category: 'mood', requirement: 5 },
  { id: 'level_5', name: 'Halfway There', description: 'Reach level 5', icon: 'star', points: 100, category: 'level', requirement: 5 },
];

// Helper function to get level info from points
export function getLevelFromPoints(points: number): LevelInfo {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].min_points) {
      return LEVEL_THRESHOLDS[i];
    }
  }
  return LEVEL_THRESHOLDS[0];
}

// Helper function to get points needed for next level
export function getPointsToNextLevel(points: number): number {
  const currentLevel = getLevelFromPoints(points);
  const nextLevel = LEVEL_THRESHOLDS.find(l => l.level === currentLevel.level + 1);
  if (!nextLevel) return 0;
  return nextLevel.min_points - points;
}

// Helper function to calculate progress percentage to next level
export function getLevelProgress(points: number): number {
  const currentLevel = getLevelFromPoints(points);
  const nextLevel = LEVEL_THRESHOLDS.find(l => l.level === currentLevel.level + 1);
  if (!nextLevel) return 100;

  const pointsInCurrentLevel = points - currentLevel.min_points;
  const pointsNeededForNextLevel = nextLevel.min_points - currentLevel.min_points;
  return Math.round((pointsInCurrentLevel / pointsNeededForNextLevel) * 100);
}
