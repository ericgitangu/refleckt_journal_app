import axios from "axios";
import type {
  GamificationStats,
  PointsTransaction,
  Achievement,
} from "@/types/gamification";

// Use local API routes to avoid CORS issues
// These routes proxy to the backend with proper auth
const localApiClient = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
});

export const gamificationApi = {
  // Get user's gamification stats
  getStats: async (): Promise<GamificationStats> => {
    const response = await localApiClient.get("/api/gamification");
    return response.data as GamificationStats;
  },

  // Get recent points transactions
  getTransactions: async (
    limit: number = 20
  ): Promise<PointsTransaction[]> => {
    const response = await localApiClient.get(`/api/gamification/transactions?limit=${limit}`);
    return response.data as PointsTransaction[];
  },

  // Get all achievements (locked and unlocked)
  getAchievements: async (): Promise<Achievement[]> => {
    const response = await localApiClient.get("/api/gamification/achievements");
    return response.data as Achievement[];
  },

  // Note: These POST endpoints are handled automatically by the backend gamification service
  // when entries are created/updated. The frontend just needs to refresh data after actions.

  // Refresh gamification data after an action (entry created, etc.)
  refreshStats: async (): Promise<GamificationStats> => {
    // Just refetch stats - backend updates happen via EventBridge events
    const response = await localApiClient.get("/api/gamification");
    return response.data as GamificationStats;
  },
};
