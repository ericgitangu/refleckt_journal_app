import axios from "axios";
import { WritingStats, MoodDistribution } from "@/types/analytics";

// Use local API routes to avoid CORS issues
const localApiClient = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
});

export const analyticsApi = {
  // Get writing statistics
  getWritingStats: async (
    period: "week" | "month" | "year" | "all" = "month",
  ) => {
    const response = await localApiClient.get("/api/analytics/writing-stats", {
      params: { period },
    });
    return response.data as WritingStats;
  },

  // Get mood distribution over time
  getMoodDistribution: async (period: "week" | "month" | "year" = "month") => {
    const response = await localApiClient.get("/api/analytics/mood", {
      params: { period },
    });
    return response.data as MoodDistribution;
  },

  // Get current and longest streaks
  getStreaks: async () => {
    const response = await localApiClient.get("/api/analytics/streaks");
    return response.data;
  },
};
