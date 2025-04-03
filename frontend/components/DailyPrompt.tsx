"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDailyPrompt, Prompt } from "../src/services/api";
import { PromptCard } from "@/components/PromptCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

interface DailyPromptProps {
  onUsePrompt?: (prompt: Prompt) => void;
  refreshInterval?: number; // In milliseconds
  showRefreshButton?: boolean;
  compact?: boolean;
}

export function DailyPrompt({
  onUsePrompt,
  refreshInterval,
  showRefreshButton = true,
  compact = false,
}: DailyPromptProps) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchDailyPrompt = async (showLoading = true) => {
    if (showLoading) {
      setIsRefreshing(true);
    }

    try {
      const response = await getDailyPrompt();
      setPrompt(response.prompt);
      setError(null);
    } catch (err) {
      console.error("Error fetching daily prompt:", err);
      setError("Could not load today\'s prompt");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch daily prompt on mount
  useEffect(() => {
    fetchDailyPrompt(true);

    // Set up refresh interval if specified
    if (refreshInterval) {
      const interval = setInterval(() => {
        fetchDailyPrompt(false);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const handleRefresh = () => {
    fetchDailyPrompt(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 rounded-lg bg-muted/20 h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-muted/20 h-[200px]">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      {showRefreshButton && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 z-10 rounded-full p-2"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span className="sr-only">Refresh</span>
        </Button>
      )}
      {prompt && (
        <PromptCard
          prompt={adaptPrompt(prompt)}
          onUsePrompt={adaptOnUsePrompt(onUsePrompt)}
          compact={compact}
        />
      )}
    </div>
  );
}

// Add these adapter functions to both DailyPrompt.tsx and RandomPrompt.tsx
const adaptPrompt = (prompt: Prompt) => {
  return {
    ...prompt,
    created_at: prompt.createdAt,
  };
};

// Adapter for the callback function
const adaptOnUsePrompt = (callback?: (prompt: Prompt) => void) => {
  if (!callback) return undefined;
  
  return (oldPrompt: any) => {
    // Convert old format to new format before passing to callback
    const newPrompt = {
      ...oldPrompt,
      createdAt: oldPrompt.created_at,
    };
    callback(newPrompt);
  };
};
