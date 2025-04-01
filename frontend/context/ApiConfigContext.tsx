"use client";

import React, { createContext, useContext } from "react";

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

// Initial config state
const initialConfig: ApiConfig = {
  apiUrl: "",
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
  version: "",
  isLoaded: false,
};

// Create context
const ApiConfigContext = createContext<ApiConfig>(initialConfig);

// Use a class component to avoid hook-based issues during SSR
class ApiConfigProviderClass extends React.Component<
  { children: React.ReactNode },
  { config: ApiConfig }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      config: initialConfig,
    };
  }

  componentDidMount() {
    this.fetchConfig();
  }

  fetchConfig = async () => {
    try {
      const response = await fetch("/api/config");

      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.status}`);
      }

      const data = await response.json();

      this.setState({
        config: {
          ...data,
          isLoaded: true,
        },
      });
    } catch (error) {
      console.error("Error loading API configuration:", error);
      this.setState({
        config: {
          ...initialConfig,
          isLoaded: true,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error loading configuration",
        },
      });
    }
  };

  render() {
    return (
      <ApiConfigContext.Provider value={this.state.config}>
        {this.props.children}
      </ApiConfigContext.Provider>
    );
  }
}

// Wrapper function component for the class-based provider
export function ApiConfigProvider({ children }: { children: React.ReactNode }) {
  return <ApiConfigProviderClass>{children}</ApiConfigProviderClass>;
}

// Hook for using the API configuration (use only in client components)
export function useApiConfig() {
  const context = useContext(ApiConfigContext);

  if (context === undefined) {
    throw new Error("useApiConfig must be used within an ApiConfigProvider");
  }

  return context;
}
