"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getDailyPrompt, getRandomPrompt, Prompt } from "../src/services/api";
import { PromptCard } from "@/components/PromptCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RefreshCw, Loader2, Sparkles, Shuffle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyPromptProps {
  onUsePrompt?: (prompt: Prompt) => void;
  refreshInterval?: number; // In milliseconds
  showRefreshButton?: boolean;
  showGetAnotherButton?: boolean;
  compact?: boolean;
  variant?: "default" | "card" | "minimal";
}

export function DailyPrompt({
  onUsePrompt,
  refreshInterval,
  showRefreshButton = true,
  showGetAnotherButton = true,
  compact = false,
  variant = "default",
}: DailyPromptProps) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGettingAnother, setIsGettingAnother] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptSource, setPromptSource] = useState<"daily" | "random">("daily");
  const router = useRouter();

  const fetchDailyPrompt = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsRefreshing(true);
    }

    try {
      const response = await getDailyPrompt();
      setPrompt(response.prompt);
      setPromptSource("daily");
      setError(null);
    } catch (err) {
      console.error("Error fetching daily prompt:", err);
      setError("Could not load today's prompt");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchRandomPrompt = useCallback(async () => {
    setIsGettingAnother(true);

    try {
      const response = await getRandomPrompt();
      setPrompt(response.prompt);
      setPromptSource("random");
      setError(null);
    } catch (err) {
      console.error("Error fetching random prompt:", err);
      setError("Could not load another prompt");
    } finally {
      setIsGettingAnother(false);
    }
  }, []);

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
  }, [refreshInterval, fetchDailyPrompt]);

  const handleRefresh = () => {
    fetchDailyPrompt(true);
  };

  const handleGetAnother = () => {
    fetchRandomPrompt();
  };

  const handleUsePrompt = () => {
    if (prompt && onUsePrompt) {
      onUsePrompt(prompt);
    } else if (prompt) {
      // Navigate to new entry with prompt
      router.push(`/journal/new?prompt=${encodeURIComponent(prompt.text)}`);
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("", variant === "minimal" && "border-0 shadow-none bg-transparent")}>
        <CardContent className={cn("flex items-center justify-center", compact ? "p-6 h-32" : "p-8 h-48")}>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error && !prompt) {
    return (
      <Card className={cn("", variant === "minimal" && "border-0 shadow-none bg-transparent")}>
        <CardContent className={cn("flex flex-col items-center justify-center text-center", compact ? "p-6 h-32" : "p-8 h-48")}>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (variant === "card") {
    return (
      <Card className="bg-gradient-to-br from-primary/5 via-transparent to-primary/10 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              {promptSource === "daily" ? "Today's Prompt" : "Writing Prompt"}
            </CardTitle>
            <div className="flex gap-1">
              {showGetAnotherButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={handleGetAnother}
                  disabled={isGettingAnother}
                  title="Get a different prompt"
                >
                  <Shuffle className={cn("h-4 w-4", isGettingAnother && "animate-spin")} />
                </Button>
              )}
              {showRefreshButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title="Refresh daily prompt"
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </Button>
              )}
            </div>
          </div>
          {prompt?.category && (
            <CardDescription className="capitalize">{prompt.category}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <p className={cn("text-foreground leading-relaxed", compact ? "text-sm" : "text-base")}>
            {prompt?.text}
          </p>
          {onUsePrompt && (
            <Button
              className="mt-4 w-full"
              onClick={handleUsePrompt}
              variant="default"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Use This Prompt
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant - uses PromptCard
  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {showGetAnotherButton && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-2 h-8 w-8"
            onClick={handleGetAnother}
            disabled={isGettingAnother}
            title="Get a different prompt"
          >
            <Shuffle className={cn("h-4 w-4", isGettingAnother && "animate-spin")} />
            <span className="sr-only">Get Another</span>
          </Button>
        )}
        {showRefreshButton && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-2 h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh daily prompt"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            <span className="sr-only">Refresh</span>
          </Button>
        )}
      </div>
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

// Adapter functions for PromptCard compatibility
const adaptPrompt = (prompt: Prompt) => {
  return {
    ...prompt,
    created_at: prompt.createdAt,
  };
};

const adaptOnUsePrompt = (callback?: (prompt: Prompt) => void) => {
  if (!callback) return undefined;

  return (oldPrompt: { id: string; text: string; category: string; created_at?: string }) => {
    const newPrompt = {
      ...oldPrompt,
      createdAt: oldPrompt.created_at || new Date().toISOString(),
    };
    callback(newPrompt as Prompt);
  };
};

export default DailyPrompt;
