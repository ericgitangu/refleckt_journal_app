"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ClientOnly } from "@/components/ClientOnly";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";

interface Insight {
  id: string;
  entry_id: string;
  title: string;
  content: string;
  created_at: string;
  insight_type: string;
}

// Mock data for fallback if API fails
const FALLBACK_INSIGHTS: Insight[] = [
  {
    id: "fallback-1",
    entry_id: "fallback",
    title: "Journaling Benefits",
    content:
      "Regular journaling has been shown to reduce stress and improve mental clarity. Try to maintain consistency in your writing practice.",
    created_at: new Date().toISOString(),
    insight_type: "suggestions",
  },
  {
    id: "fallback-2",
    entry_id: "fallback",
    title: "Reflection Time",
    content:
      "Consider setting aside 5 minutes after journaling to reflect on what you\'ve written. This can help deepen the benefits of your practice.",
    created_at: new Date().toISOString(),
    insight_type: "suggestions",
  },
];

// AI Insights content component that uses React hooks
function AIInsightsContent() {
  const { data: session, status } = useSession();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insightType, setInsightType] = useState("all");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (status === "authenticated") {
      fetchInsights(insightType);
    }
  }, [status, insightType, retryCount]);

  const fetchInsights = async (type: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai-insights?type=${type}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      setInsights(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching insights:", err);

      // Still show fallback data even when there&apos;s an error
      setInsights(FALLBACK_INSIGHTS);

      // But also show error message so user knows data is fallback
      setError("Failed to load AI insights. Showing generic insights instead.");
    } finally {
      setLoading(false);
    }
  };

  const generateNewInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai-insights/generate", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate insights");
      }

      // Force a refresh of insights by updating retry count
      setRetryCount((prev) => prev + 1);
    } catch (err) {
      console.error("Error generating insights:", err);
      setError("Failed to generate AI insights. Please try again later.");
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  if (status === "loading") {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">AI Insights</h1>
        <div className="flex gap-2">
          {error && (
            <Button variant="outline" onClick={handleRetry}>
              <Icons.refresh className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
          <Button onClick={generateNewInsights} disabled={loading}>
            <Icons.brain className="mr-2 h-4 w-4" />
            Generate New Insights
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setInsightType("all")}>
            All Insights
          </TabsTrigger>
          <TabsTrigger
            value="patterns"
            onClick={() => setInsightType("patterns")}
          >
            Patterns
          </TabsTrigger>
          <TabsTrigger
            value="suggestions"
            onClick={() => setInsightType("suggestions")}
          >
            Suggestions
          </TabsTrigger>
          <TabsTrigger
            value="reflections"
            onClick={() => setInsightType("reflections")}
          >
            Reflections
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {error && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-amber-500 mb-4 flex items-center">
              <Icons.alertTriangle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-6 grid-cols-1">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-4/5 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Icons.brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No insights yet</h3>
              <p className="text-muted-foreground mb-4">
                Write more journal entries to get AI-powered insights and
                recommendations.
              </p>
              <Button onClick={generateNewInsights}>Generate Insights</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1">
          {insights.map((insight) => (
            <Card key={insight.id}>
              <CardHeader>
                <CardTitle>{insight.title}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {new Date(insight.created_at).toLocaleDateString()}
                </div>
              </CardHeader>
              <CardContent>
                <p>{insight.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// AI Insights page with ClientOnly wrapper
export default function AIInsightsPage() {
  return (
    <ClientOnly>
      <AIInsightsContent />
    </ClientOnly>
  );
}
