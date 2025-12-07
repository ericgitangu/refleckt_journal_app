"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Check } from "lucide-react";
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
  const [hasGenerated, setHasGenerated] = useState(hasExistingInsights);

  const handleRequestInsights = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/entries/${entryId}/insights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to generate insights: ${response.status}`);
      }

      const insights = await response.json();
      setHasGenerated(true);

      toast({
        title: "Insights Generated",
        description: "AI analysis of your entry is ready!",
      });

      if (onInsightsGenerated) {
        onInsightsGenerated(insights);
      }
    } catch (error) {
      console.error("Error requesting insights:", error);
      toast({
        title: "Error",
        description: "Failed to generate insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRequestInsights}
      disabled={isLoading}
      variant={hasGenerated ? "outline" : "default"}
      size="sm"
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Analyzing...
        </>
      ) : hasGenerated ? (
        <>
          <Check className="h-4 w-4 mr-2 text-green-500" />
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
