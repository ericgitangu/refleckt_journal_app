import axios from "axios";
import { UserSettings } from "@/types/settings";

// Use local API routes to avoid CORS issues
// These routes proxy to the backend with proper auth
const localApiClient = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
});

export const settingsApi = {
  // Get user settings
  getSettings: async () => {
    const response = await localApiClient.get("/api/settings");
    return response.data as UserSettings;
  },

  // Update user settings
  updateSettings: async (settings: Partial<UserSettings>) => {
    const response = await localApiClient.put("/api/settings", settings);
    return response.data;
  },

  // Update specific setting
  updateSetting: async (key: keyof UserSettings, value: any) => {
    const response = await localApiClient.patch("/api/settings", { [key]: value });
    return response.data;
  },
};
