"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Check, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { EntryInsights } from "@/types/insights";

interface InsightsRequestButtonProps {
  entryId: string;
  hasExistingInsights?: boolean;
  onInsightsGenerated?: (insights: EntryInsights) => void;
  className?: string;
}

export function InsightsRequestButton({
  entryId,
  hasExistingInsights = false,
  onInsightsGenerated,
  className,
}: InsightsRequestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [hasGenerated, setHasGenerated] = useState(hasExistingInsights);

  // Update hasGenerated when prop changes
  useEffect(() => {
    setHasGenerated(hasExistingInsights);
  }, [hasExistingInsights]);

  // Fetch insights (GET request)
  const fetchInsights = useCallback(async (): Promise<EntryInsights | null> => {
    try {
      const response = await fetch(`/api/entries/${entryId}/insights`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 404) {
        // No insights yet - they may still be generating
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch insights: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching insights:", error);
      return null;
    }
  }, [entryId]);

  // Poll for insights with retry logic
  const pollForInsights = useCallback(async () => {
    const maxAttempts = 6; // Poll for up to 30 seconds (6 attempts x 5 seconds)
    let attempts = 0;

    setIsPolling(true);
    setPollAttempts(0);

    const poll = async (): Promise<EntryInsights | null> => {
      attempts++;
      setPollAttempts(attempts);

      const insights = await fetchInsights();
      if (insights) {
        return insights;
      }

      if (attempts < maxAttempts) {
        // Wait 5 seconds before next attempt
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return poll();
      }

      return null;
    };

    try {
      const insights = await poll();
      if (insights) {
        setHasGenerated(true);
        toast({
          title: "Insights Ready",
          description: "AI analysis of your entry is available!",
        });
        if (onInsightsGenerated) {
          onInsightsGenerated(insights);
        }
      } else {
        toast({
          title: "Insights Pending",
          description: "AI insights are still being generated. They'll appear automatically when ready.",
        });
      }
    } finally {
      setIsPolling(false);
      setPollAttempts(0);
    }
  }, [fetchInsights, onInsightsGenerated]);

  // Handle button click - fetch or refresh insights
  const handleRequestInsights = async () => {
    if (isLoading || isPolling) return;

    setIsLoading(true);
    try {
      // First, try to fetch existing insights
      const insights = await fetchInsights();

      if (insights) {
        // Insights exist - show them
        setHasGenerated(true);
        toast({
          title: hasGenerated ? "Insights Refreshed" : "Insights Ready",
          description: "AI analysis of your entry is available!",
        });
        if (onInsightsGenerated) {
          onInsightsGenerated(insights);
        }
      } else {
        // No insights yet - they are generated async when entry is saved
        // Start polling for them
        toast({
          title: "Checking for Insights",
          description: "AI insights are generated when you save your entry. Checking...",
        });
        setIsLoading(false);
        await pollForInsights();
        return;
      }
    } catch (error) {
      console.error("Error requesting insights:", error);
      toast({
        title: "Error",
        description: "Failed to fetch insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRequestInsights}
      disabled={isLoading || isPolling}
      variant={hasGenerated ? "outline" : "default"}
      size="sm"
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Checking...
        </>
      ) : isPolling ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Waiting... ({pollAttempts}/6)
        </>
      ) : hasGenerated ? (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Insights
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          Get AI Insights
        </>
      )}
    </Button>
  );
}
