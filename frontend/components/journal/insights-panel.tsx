import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface InsightsPanelProps {
  insights: any;
  isLoading: boolean;
  entryId: string;
}

export default function InsightsPanel({
  insights,
  isLoading,
  entryId,
}: InsightsPanelProps) {
  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!insights || insights.length === 0) {
    return <div>No insights available for this entry yet.</div>;
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">AI Insights</h3>
      <div className="space-y-4">
        {insights.map((insight: any, index: number) => (
          <div key={index} className="p-3 bg-secondary/50 rounded-md">
            {insight.content}
          </div>
        ))}
      </div>
    </div>
  );
}
