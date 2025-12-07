import axios from "axios";
import type {
  GamificationStats,
  PointsTransaction,
  Achievement,
  ACHIEVEMENTS_CONFIG,
  LEVEL_THRESHOLDS,
  getLevelFromPoints,
  getPointsToNextLevel,
} from "@/types/gamification";

// Use local API routes to avoid CORS issues
// These routes proxy to the backend with proper auth
const localApiClient = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
});

// Mock data for development until backend is ready
const mockGamificationStats: GamificationStats = {
  user_id: "user_1",
  tenant_id: "default",
  points_balance: 350,
  lifetime_points: 350,
  level: 3,
  level_title: "Regular Reflector",
  current_streak: 5,
  longest_streak: 12,
  last_entry_date: new Date().toISOString().split("T")[0],
  achievements: [
    {
      id: "first_entry",
      name: "First Steps",
      description: "Create your first journal entry",
      icon: "pencil",
      points: 10,
      unlocked: true,
      unlocked_at: "2024-01-15T10:30:00Z",
      category: "entries",
      requirement: 1,
    },
    {
      id: "streak_3",
      name: "Getting Started",
      description: "Maintain a 3-day streak",
      icon: "flame",
      points: 25,
      unlocked: true,
      unlocked_at: "2024-01-18T08:00:00Z",
      category: "streak",
      requirement: 3,
    },
    {
      id: "entries_10",
      name: "Consistent Writer",
      description: "Write 10 journal entries",
      icon: "book",
      points: 50,
      unlocked: true,
      unlocked_at: "2024-02-01T15:45:00Z",
      category: "entries",
      requirement: 10,
    },
    {
      id: "streak_7",
      name: "Week Warrior",
      description: "Maintain a 7-day streak",
      icon: "flame",
      points: 50,
      unlocked: false,
      category: "streak",
      requirement: 7,
      progress: 5,
    },
    {
      id: "entries_50",
      name: "Dedicated Journaler",
      description: "Write 50 journal entries",
      icon: "book",
      points: 150,
      unlocked: false,
      category: "entries",
      requirement: 50,
      progress: 15,
    },
  ],
  total_entries: 15,
  total_words: 4500,
  insights_requested: 3,
  prompts_used: 5,
  next_level_points: 600,
  points_to_next_level: 250,
  created_at: "2024-01-15T10:00:00Z",
  updated_at: new Date().toISOString(),
};

const mockTransactions: PointsTransaction[] = [
  {
    id: "tx_1",
    user_id: "user_1",
    amount: 10,
    reason: "entry_created",
    description: "Created journal entry",
    entry_id: "entry_123",
    created_at: new Date().toISOString(),
  },
  {
    id: "tx_2",
    user_id: "user_1",
    amount: 15,
    reason: "streak_continued",
    description: "Streak continued (5 days)",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "tx_3",
    user_id: "user_1",
    amount: 5,
    reason: "ai_insights",
    description: "Requested AI insights",
    entry_id: "entry_122",
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

// Flag to use mock data when backend isn't ready
// Set to false for production - backend gamification endpoints required
const USE_MOCK = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL;

export const gamificationApi = {
  // Get user's gamification stats
  getStats: async (): Promise<GamificationStats> => {
    if (USE_MOCK) {
      return mockGamificationStats;
    }
    // Use local API route to avoid CORS
    const response = await localApiClient.get("/api/gamification");
    return response.data as GamificationStats;
  },

  // Get recent points transactions
  getTransactions: async (
    limit: number = 20
  ): Promise<PointsTransaction[]> => {
    if (USE_MOCK) {
      return mockTransactions.slice(0, limit);
    }
    // Use local API route to avoid CORS
    const response = await localApiClient.get(`/api/gamification/transactions?limit=${limit}`);
    return response.data as PointsTransaction[];
  },

  // Get all achievements (locked and unlocked)
  getAchievements: async (): Promise<Achievement[]> => {
    if (USE_MOCK) {
      return mockGamificationStats.achievements;
    }
    // Use local API route to avoid CORS
    const response = await localApiClient.get("/api/gamification/achievements");
    return response.data as Achievement[];
  },

  // Award points (called internally when entry is created)
  awardPoints: async (
    reason: string,
    entryId?: string
  ): Promise<{ points: number; newTotal: number }> => {
    if (USE_MOCK) {
      return { points: 10, newTotal: mockGamificationStats.points_balance + 10 };
    }
    const response = await localApiClient.post("/api/gamification/award", {
      reason,
      entry_id: entryId,
    });
    return response.data;
  },

  // Check and unlock achievements
  checkAchievements: async (): Promise<Achievement[]> => {
    if (USE_MOCK) {
      return [];
    }
    const response = await localApiClient.post("/api/gamification/check-achievements");
    return response.data as Achievement[];
  },

  // Update streak (called when creating an entry)
  updateStreak: async (): Promise<{ current: number; longest: number }> => {
    if (USE_MOCK) {
      return {
        current: mockGamificationStats.current_streak,
        longest: mockGamificationStats.longest_streak,
      };
    }
    const response = await localApiClient.post("/api/gamification/streak");
    return response.data;
  },

  // Get leaderboard (optional feature)
  getLeaderboard: async (
    period: "weekly" | "monthly" | "all_time" = "weekly"
  ): Promise<
    Array<{
      user_id: string;
      username: string;
      points: number;
      level: number;
      rank: number;
    }>
  > => {
    if (USE_MOCK) {
      return [
        {
          user_id: "user_1",
          username: "You",
          points: 350,
          level: 3,
          rank: 1,
        },
      ];
    }
    const response = await localApiClient.get(
      `/api/gamification/leaderboard?period=${period}`
    );
    return response.data;
  },
};
