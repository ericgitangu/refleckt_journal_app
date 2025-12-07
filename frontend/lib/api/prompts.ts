import axios from "axios";
import { Prompt, PromptCategory } from "@/types/prompts";

// Use local API routes to avoid CORS issues
const localApiClient = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
});

export const promptsApi = {
  // Get daily prompt
  getDailyPrompt: async () => {
    const response = await localApiClient.get("/api/prompts/daily");
    return response.data;
  },

  // Get prompt by ID
  getPrompt: async (promptId: string) => {
    const response = await localApiClient.get(`/api/prompts/${promptId}`);
    return response.data;
  },

  // Get prompts by category
  getPromptsByCategory: async (category: string) => {
    const response = await localApiClient.get("/api/prompts", {
      params: { category },
    });
    return response.data;
  },

  // Get all prompt categories
  getCategories: async () => {
    const response = await localApiClient.get("/api/prompts/categories");
    return response.data as PromptCategory[];
  },

  // Get prompts history (previously shown to user)
  getPromptHistory: async () => {
    const response = await localApiClient.get("/api/prompts/history");
    return response.data;
  },
};
