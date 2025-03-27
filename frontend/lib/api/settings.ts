import apiClient from './client';
import { UserSettings } from '@/types/settings';

export const settingsApi = {
  // Get user settings
  getSettings: async () => {
    const response = await apiClient.get('/settings');
    return response.data as UserSettings;
  },
  
  // Update user settings
  updateSettings: async (settings: Partial<UserSettings>) => {
    const response = await apiClient.put('/settings', settings);
    return response.data;
  },
  
  // Update specific setting
  updateSetting: async (key: keyof UserSettings, value: any) => {
    const response = await apiClient.patch('/settings', { [key]: value });
    return response.data;
  }
}; 