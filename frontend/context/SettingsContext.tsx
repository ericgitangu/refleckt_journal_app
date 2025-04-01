import React, { createContext, useContext, useState, useEffect } from "react";
import { settingsApi } from "@/lib/api/settings";
import { UserSettings } from "@/types/settings";

interface SettingsContextType {
  settings: UserSettings | null;
  isLoading: boolean;
  error: Error | null;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  refetchSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load settings on mount
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await settingsApi.getSettings();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update settings
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      setIsLoading(true);
      const updated = await settingsApi.updateSettings(newSettings);
      setSettings(updated);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        error,
        updateSettings,
        refetchSettings: fetchSettings,
      }}
    >
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
