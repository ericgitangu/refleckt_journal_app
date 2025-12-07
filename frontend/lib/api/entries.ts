import axios from "axios";
import {
  Entry,
  CreateEntryRequest,
  UpdateEntryRequest,
  SearchEntryParams,
} from "@/types/entries";

// Use local API routes to avoid CORS issues
// These routes proxy to the backend with proper auth
const localApiClient = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
});

export const entriesApi = {
  // Get all entries with optional pagination and filtering
  getEntries: async (params?: SearchEntryParams) => {
    const response = await localApiClient.get("/api/entries", { params });
    return response.data;
  },

  // Get a single entry by ID
  getEntry: async (id: string) => {
    const response = await localApiClient.get(`/api/entries/${id}`);
    return response.data;
  },

  // Create a new entry
  createEntry: async (entry: CreateEntryRequest) => {
    const response = await localApiClient.post("/api/entries", entry);
    return response.data;
  },

  // Update an existing entry
  updateEntry: async (id: string, entry: UpdateEntryRequest) => {
    const response = await localApiClient.put(`/api/entries/${id}`, entry);
    return response.data;
  },

  // Delete an entry
  deleteEntry: async (id: string) => {
    await localApiClient.delete(`/api/entries/${id}`);
  },

  // Search entries with advanced criteria
  searchEntries: async (params: SearchEntryParams) => {
    const response = await localApiClient.get("/api/entries/search", { params });
    return response.data;
  },

  // Get all tags used by the user
  getTags: async () => {
    const response = await localApiClient.get("/api/entries/tags");
    return response.data;
  },

  // Suggest tags for entry content
  suggestTags: async (content: string, existingTags: string[] = []) => {
    const response = await localApiClient.post("/api/entries/suggest-tags", {
      content,
      existing_tags: existingTags,
    });
    return response.data;
  },

  // Export entries
  exportEntries: async (format: "json" | "pdf" | "markdown") => {
    const response = await localApiClient.get("/api/entries/export", {
      params: { format },
      responseType: "blob",
    });
    return response.data;
  },
};
