import apiClient from "./client";
import { Prompt, PromptCategory } from "@/types/prompts";

export const promptsApi = {
  // Get daily prompt
  getDailyPrompt: async () => {
    const response = await apiClient.get("/prompts/daily");
    return response.data;
  },

  // Get prompt by ID
  getPrompt: async (promptId: string) => {
    const response = await apiClient.get(`/prompts/${promptId}`);
    return response.data;
  },

  // Get prompts by category
  getPromptsByCategory: async (category: string) => {
    const response = await apiClient.get("/prompts", {
      params: { category },
    });
    return response.data;
  },

  // Get all prompt categories
  getCategories: async () => {
    const response = await apiClient.get("/prompts/categories");
    return response.data as PromptCategory[];
  },

  // Get prompts history (previously shown to user)
  getPromptHistory: async () => {
    const response = await apiClient.get("/prompts/history");
    return response.data;
  },
};
