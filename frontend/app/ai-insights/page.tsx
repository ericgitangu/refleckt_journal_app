"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ClientOnly } from "@/components/ClientOnly";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";

interface Insight {
  id: string;
  entry_id: string;
  title: string;
  content: string;
  created_at: string;
  insight_type: string;
}

// AI Insights content component that uses React hooks
function AIInsightsContent() {
  const { data: session, status } = useSession();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insightType, setInsightType] = useState("all");

  useEffect(() => {
    if (status === "authenticated") {
      fetchInsights(insightType);
    }
  }, [status, insightType]);

  const fetchInsights = async (type: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai-insights?type=${type}`);
      if (!response.ok) {
        throw new Error("Failed to fetch AI insights");
      }
      const data = await response.json();
      setInsights(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError("Failed to load AI insights. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const generateNewInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-insights/generate', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate insights");
      }
      
      await fetchInsights(insightType);
    } catch (err) {
      console.error("Error generating insights:", err);
      setError("Failed to generate AI insights. Please try again later.");
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
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
        <Button onClick={generateNewInsights}>
          <Icons.brain className="mr-2 h-4 w-4" />
          Generate New Insights
        </Button>
      </div>

      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setInsightType("all")}>
            All Insights
          </TabsTrigger>
          <TabsTrigger value="patterns" onClick={() => setInsightType("patterns")}>
            Patterns
          </TabsTrigger>
          <TabsTrigger value="suggestions" onClick={() => setInsightType("suggestions")}>
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="reflections" onClick={() => setInsightType("reflections")}>
            Reflections
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-destructive">{error}</div>
          </CardContent>
        </Card>
      ) : insights.length === 0 ? (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Icons.brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No insights yet</h3>
              <p className="text-muted-foreground mb-4">
                Write more journal entries to get AI-powered insights and recommendations.
              </p>
              <Button onClick={generateNewInsights}>
                Generate Insights
              </Button>
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