'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// API Configuration types
interface ApiConfig {
  apiUrl: string;
  services: {
    entries: boolean;
    analytics: boolean;
    settings: boolean;
    ai: boolean;
  };
  features: {
    offlineMode: boolean;
    aiAnalysis: boolean;
    moodTracking: boolean;
  };
  version: string;
  isLoaded: boolean;
  error?: string;
}

const initialConfig: ApiConfig = {
  apiUrl: '',
  services: {
    entries: false,
    analytics: false,
    settings: false,
    ai: false,
  },
  features: {
    offlineMode: false,
    aiAnalysis: false,
    moodTracking: false,
  },
  version: '',
  isLoaded: false,
};

// Create context
const ApiConfigContext = createContext<ApiConfig>(initialConfig);

// Provider component
export function ApiConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ApiConfig>(initialConfig);

  useEffect(() => {
    // Fetch configuration from our backend endpoint
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        
        if (!response.ok) {
          throw new Error(`Failed to load configuration: ${response.status}`);
        }
        
        const data = await response.json();
        
        setConfig({
          ...data,
          isLoaded: true,
        });
      } catch (error) {
        console.error('Error loading API configuration:', error);
        setConfig({
          ...initialConfig,
          isLoaded: true,
          error: error instanceof Error ? error.message : 'Unknown error loading configuration',
        });
      }
    };

    fetchConfig();
  }, []);

  return (
    <ApiConfigContext.Provider value={config}>
      {children}
    </ApiConfigContext.Provider>
  );
}

// Hook for using the API configuration
export function useApiConfig() {
  const context = useContext(ApiConfigContext);
  
  if (context === undefined) {
    throw new Error('useApiConfig must be used within an ApiConfigProvider');
  }
  
  return context;
} 