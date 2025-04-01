import apiClient from "./client";
import {
  Entry,
  CreateEntryRequest,
  UpdateEntryRequest,
  SearchEntryParams,
} from "@/types/entries";

export const entriesApi = {
  // Get all entries with optional pagination and filtering
  getEntries: async (params?: SearchEntryParams) => {
    const response = await apiClient.get("/entries", { params });
    return response.data;
  },

  // Get a single entry by ID
  getEntry: async (id: string) => {
    const response = await apiClient.get(`/entries/${id}`);
    return response.data;
  },

  // Create a new entry
  createEntry: async (entry: CreateEntryRequest) => {
    const response = await apiClient.post("/entries", entry);
    return response.data;
  },

  // Update an existing entry
  updateEntry: async (id: string, entry: UpdateEntryRequest) => {
    const response = await apiClient.put(`/entries/${id}`, entry);
    return response.data;
  },

  // Delete an entry
  deleteEntry: async (id: string) => {
    await apiClient.delete(`/entries/${id}`);
  },

  // Search entries with advanced criteria
  searchEntries: async (params: SearchEntryParams) => {
    const response = await apiClient.get("/entries/search", { params });
    return response.data;
  },

  // Get all tags used by the user
  getTags: async () => {
    const response = await apiClient.get("/entries/tags");
    return response.data;
  },

  // Suggest tags for entry content
  suggestTags: async (content: string, existingTags: string[] = []) => {
    const response = await apiClient.post("/entries/suggest-tags", {
      content,
      existing_tags: existingTags,
    });
    return response.data;
  },

  // Export entries
  exportEntries: async (format: "json" | "pdf" | "markdown") => {
    const response = await apiClient.get("/entries/export", {
      params: { format },
      responseType: "blob",
    });
    return response.data;
  },
};
