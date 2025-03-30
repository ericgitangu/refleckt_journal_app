"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { promptsApi, Prompt } from "@/lib/api";
import { PromptCard } from "@/components/PromptCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

// Fallback prompt when API fails
const FALLBACK_PROMPT: Prompt = {
  id: "fallback-random",
  text: "What would you like to explore in your journal today? Consider a challenge you're facing, a joy you've experienced, or a hope for tomorrow.",
  category: "reflective",
  created_at: new Date().toISOString(),
  tags: ["general", "reflection", "open-ended"]
};

interface RandomPromptProps {
  onUsePrompt?: (prompt: Prompt) => void;
  initialFetch?: boolean;
  compact?: boolean;
  label?: string;
}

export function RandomPrompt({
  onUsePrompt,
  initialFetch = true,
  compact = false,
  label = "Get Inspired",
}: RandomPromptProps) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(initialFetch);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchRandomPrompt = async () => {
    setIsLoading(true);

    try {
      const response = await promptsApi.getRandom();
      setPrompt(response.prompt);
      setError(null);
    } catch (err) {
      console.error("Error fetching random prompt:", err);
      // Set fallback prompt instead of just error
      setPrompt(FALLBACK_PROMPT);
      setError("Could not load a prompt. Showing fallback prompt instead.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch random prompt on mount if initialFetch is true
  useEffect(() => {
    if (initialFetch) {
      fetchRandomPrompt();
    }
  }, [initialFetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 rounded-lg bg-muted/20 h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prompt) {
    // Always show a prompt option - either a real one or the fallback
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-muted/20 h-[200px]">
        <p className="text-muted-foreground mb-4">No prompt loaded yet</p>
        <Button onClick={fetchRandomPrompt} variant="outline" size="sm">
          {label}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      {error && (
        <div className="absolute top-2 left-2 z-10 text-xs text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded">
          {error}
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 z-10 rounded-full p-2"
        onClick={fetchRandomPrompt}
      >
        <RefreshCw className="h-4 w-4" />
        <span className="sr-only">New Random Prompt</span>
      </Button>
      <PromptCard prompt={prompt} onUsePrompt={onUsePrompt} compact={compact} />
    </div>
  );
}
