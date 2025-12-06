"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useTheme } from "next-themes";
import { settingsApi } from "@/lib/api/settings";
import {
  UserSettings,
  NotificationPreferences,
  DisplayPreferences,
  DEFAULT_SETTINGS,
} from "@/types/settings";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "reflekt_settings";

interface SettingsContextType {
  settings: UserSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  updateNotificationPreferences: (updates: Partial<NotificationPreferences>) => void;
  updateDisplayPreferences: (updates: Partial<DisplayPreferences>) => void;
  saveSettings: () => Promise<boolean>;
  refetchSettings: () => Promise<void>;
  requestBrowserNotifications: () => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

// Merge settings with defaults to ensure all fields exist
function mergeWithDefaults(settings: Partial<UserSettings> | null): UserSettings {
  if (!settings) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    notificationPreferences: {
      ...DEFAULT_SETTINGS.notificationPreferences,
      ...settings.notificationPreferences,
    },
    displayPreferences: {
      ...DEFAULT_SETTINGS.displayPreferences,
      ...settings.displayPreferences,
    },
  };
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { setTheme, theme: currentTheme } = useTheme();

  // Load settings from localStorage first, then API
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load from localStorage for immediate display
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setSettings(mergeWithDefaults(parsed));
        } catch {
          // Invalid cache, ignore
        }
      }

      // Fetch from API for latest data
      const data = await settingsApi.getSettings();
      const merged = mergeWithDefaults(data);
      setSettings(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (err) {
      console.error("Error fetching settings:", err);
      // Keep using cached/default settings on error
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Sync theme with next-themes whenever settings.theme changes
  useEffect(() => {
    if (settings.theme && settings.theme !== currentTheme) {
      setTheme(settings.theme);
    }
  }, [settings.theme, setTheme, currentTheme]);

  // Update top-level settings (immediate local update)
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = mergeWithDefaults({ ...prev, ...newSettings });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Update notification preferences
  const updateNotificationPreferences = useCallback(
    (updates: Partial<NotificationPreferences>) => {
      setSettings((prev) => {
        const updated = {
          ...prev,
          notificationPreferences: {
            ...prev.notificationPreferences,
            ...updates,
          },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  // Update display preferences
  const updateDisplayPreferences = useCallback(
    (updates: Partial<DisplayPreferences>) => {
      setSettings((prev) => {
        const updated = {
          ...prev,
          displayPreferences: {
            ...prev.displayPreferences,
            ...updates,
          },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  // Save settings to API
  const saveSettings = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      await settingsApi.updateSettings(settings);
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
      return true;
    } catch (err) {
      console.error("Error saving settings:", err);
      setError(err as Error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  // Request browser notification permission
  const requestBrowserNotifications = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast({
        title: "Not supported",
        description: "Browser notifications are not supported on this device.",
        variant: "destructive",
      });
      return false;
    }

    if (Notification.permission === "granted") {
      updateNotificationPreferences({ browserNotifications: true });
      return true;
    }

    if (Notification.permission === "denied") {
      toast({
        title: "Notifications blocked",
        description: "Please enable notifications in your browser settings.",
        variant: "destructive",
      });
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      updateNotificationPreferences({ browserNotifications: true });
      toast({
        title: "Notifications enabled",
        description: "You'll now receive browser notifications.",
      });
      return true;
    }

    return false;
  }, [updateNotificationPreferences]);

  const value = useMemo(
    () => ({
      settings,
      isLoading,
      isSaving,
      error,
      updateSettings,
      updateNotificationPreferences,
      updateDisplayPreferences,
      saveSettings,
      refetchSettings: fetchSettings,
      requestBrowserNotifications,
    }),
    [
      settings,
      isLoading,
      isSaving,
      error,
      updateSettings,
      updateNotificationPreferences,
      updateDisplayPreferences,
      saveSettings,
      fetchSettings,
      requestBrowserNotifications,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

// Convenience hooks for specific settings
export function useDisplayPreferences() {
  const { settings } = useSettings();
  return settings.displayPreferences;
}

export function useDateFormat() {
  const { settings } = useSettings();
  return settings.dateFormat;
}
