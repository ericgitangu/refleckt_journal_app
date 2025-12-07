import axios from "axios";
import { Insight, InsightType } from "@/types/insights";

// Use local API routes to avoid CORS issues
const localApiClient = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
});

export const insightsApi = {
  // Get insights for a specific entry
  getEntryInsights: async (id: string) => {
    const response = await localApiClient.get(`/api/entries/${id}/insights`);
    return response.data;
  },

  // Get all insights for the user
  getAllInsights: async (type?: InsightType) => {
    const params = type ? { type } : undefined;
    const response = await localApiClient.get("/api/insights", { params });
    return response.data;
  },

  // Get periodic summary of insights (weekly, monthly)
  getSummary: async (period: "week" | "month" | "year") => {
    const response = await localApiClient.get("/api/insights/summary", {
      params: { period },
    });
    return response.data;
  },

  // Request analysis for a specific entry
  requestAnalysis: async (id: string) => {
    const response = await localApiClient.post(`/api/entries/${id}/insights`);
    return response.data;
  },
};
