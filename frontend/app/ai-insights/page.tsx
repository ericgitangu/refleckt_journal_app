"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ClientOnly } from "@/components/ClientOnly";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TagBadge, MoodBadge } from "@/components/ui/tag-badge";
import { formatRelativeDate, formatCardDate } from "@/lib/date-utils";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Types for AI Insights
interface EntryWithInsight {
  id: string;
  entry_id: string;
  title: string;
  content: string;
  sentiment: string;
  sentiment_score: number;
  keywords: string[];
  suggested_categories: string[];
  insights?: string;
  reflections?: string;
  provider: string;
  created_at: string;
  entry_created_at?: string;
}

interface InsightsSummary {
  total_entries: number;
  analyzed_entries: number;
  avg_sentiment_score: number;
  dominant_mood: string;
  top_keywords: string[];
  writing_streak: number;
  total_words: number;
}

// Sentiment score to visual representation
function getSentimentConfig(score: number, sentiment: string) {
  if (sentiment === "positive" || score > 0.3) {
    return {
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      icon: <Icons.trendingUp className="h-4 w-4" />,
      label: "Positive",
    };
  } else if (sentiment === "negative" || score < -0.3) {
    return {
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-100 dark:bg-rose-900/30",
      borderColor: "border-rose-200 dark:border-rose-800",
      icon: <Icons.trendingDown className="h-4 w-4" />,
      label: "Challenging",
    };
  }
  return {
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    icon: <Icons.minus className="h-4 w-4" />,
    label: "Neutral",
  };
}

// Insight card component
function InsightCard({ insight }: { insight: EntryWithInsight }) {
  const sentimentConfig = getSentimentConfig(insight.sentiment_score, insight.sentiment);
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg line-clamp-1">
              {insight.title || "Journal Entry"}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Icons.calendar className="h-3.5 w-3.5" />
              {formatCardDate(insight.entry_created_at || insight.created_at)}
            </CardDescription>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border",
            sentimentConfig.bgColor,
            sentimentConfig.color,
            sentimentConfig.borderColor
          )}>
            {sentimentConfig.icon}
            {sentimentConfig.label}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sentiment Score Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Sentiment Score</span>
            <span className={sentimentConfig.color}>
              {insight.sentiment_score > 0 ? "+" : ""}
              {(insight.sentiment_score * 100).toFixed(0)}%
            </span>
          </div>
          <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "absolute h-full rounded-full transition-all",
                insight.sentiment_score >= 0 ? "bg-emerald-500" : "bg-rose-500"
              )}
              style={{
                width: `${Math.abs(insight.sentiment_score) * 50}%`,
                left: insight.sentiment_score >= 0 ? "50%" : `${50 - Math.abs(insight.sentiment_score) * 50}%`,
              }}
            />
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border" />
          </div>
        </div>

        {/* Keywords */}
        {insight.keywords && insight.keywords.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Keywords
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {insight.keywords.slice(0, 6).map((keyword, index) => (
                <TagBadge key={index} tag={keyword} showHash={false} size="sm" />
              ))}
              {insight.keywords.length > 6 && (
                <Badge variant="secondary" className="text-xs">
                  +{insight.keywords.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Suggested Categories */}
        {insight.suggested_categories && insight.suggested_categories.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Categories
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {insight.suggested_categories.map((category, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI Insight */}
        {insight.insights && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Icons.brain className="h-3.5 w-3.5" />
              AI Insight
            </h4>
            <p className={cn(
              "text-sm text-muted-foreground leading-relaxed",
              !expanded && "line-clamp-2"
            )}>
              {insight.insights}
            </p>
          </div>
        )}

        {/* Reflection Question */}
        {insight.reflections && (
          <div className={cn(
            "p-3 rounded-lg border",
            "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
          )}>
            <h4 className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1.5">
              <Icons.sparkles className="h-3.5 w-3.5" />
              Reflection Question
            </h4>
            <p className="text-sm italic text-amber-800 dark:text-amber-300">
              {insight.reflections}
            </p>
          </div>
        )}

        {/* Expand/Collapse for long content */}
        {(insight.insights && insight.insights.length > 150) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-xs"
          >
            {expanded ? "Show Less" : "Show More"}
            <Icons.chevronDown className={cn(
              "h-3.5 w-3.5 ml-1 transition-transform",
              expanded && "rotate-180"
            )} />
          </Button>
        )}

        {/* Provider Attribution */}
        <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Analyzed by {insight.provider}</span>
          <span>{formatRelativeDate(insight.created_at)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-full",
            trend === "up" && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600",
            trend === "down" && "bg-rose-100 dark:bg-rose-900/30 text-rose-600",
            (!trend || trend === "neutral") && "bg-muted text-muted-foreground"
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// AI Insights content component
function AIInsightsContent() {
  const { data: session, status } = useSession();
  const [insights, setInsights] = useState<EntryWithInsight[]>([]);
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [generating, setGenerating] = useState(false);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch insights from API
      const [insightsRes, summaryRes] = await Promise.all([
        fetch(`/api/ai-insights?type=${activeTab}`),
        fetch("/api/analytics/summary"),
      ]);

      if (insightsRes.ok) {
        const data = await insightsRes.json();
        setInsights(Array.isArray(data) ? data : data.insights || []);
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError("Failed to load AI insights. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchInsights();
    }
  }, [status, fetchInsights]);

  const generateNewInsights = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/ai-insights/generate", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate insights");
      }

      // Refresh insights after generation
      await fetchInsights();
    } catch (err) {
      console.error("Error generating insights:", err);
      setError("Failed to generate new insights. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Filter insights based on tab
  const filteredInsights = insights.filter((insight) => {
    if (activeTab === "all") return true;
    if (activeTab === "positive") return insight.sentiment_score > 0.2;
    if (activeTab === "challenging") return insight.sentiment_score < -0.2;
    if (activeTab === "reflective") return insight.reflections;
    return true;
  });

  if (status === "loading") {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your insights...</p>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Icons.brain className="h-8 w-8 text-primary" />
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover patterns and reflections from your journal entries
          </p>
        </div>
        <div className="flex gap-2">
          {error && (
            <Button variant="outline" onClick={fetchInsights} size="sm">
              <Icons.refresh className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
          <Button
            onClick={generateNewInsights}
            disabled={generating}
            className="gap-2"
          >
            {generating ? (
              <Icons.spinner className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.sparkles className="h-4 w-4" />
            )}
            {generating ? "Generating..." : "Generate New Insights"}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {summary && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Entries Analyzed"
            value={summary.analyzed_entries}
            subtitle={`of ${summary.total_entries} total`}
            icon={<Icons.fileText className="h-5 w-5" />}
            trend="neutral"
          />
          <StatsCard
            title="Overall Mood"
            value={summary.dominant_mood || "Neutral"}
            subtitle={`Avg score: ${((summary.avg_sentiment_score || 0) * 100).toFixed(0)}%`}
            icon={<MoodBadge mood={summary.dominant_mood || "neutral"} size="sm" />}
            trend={summary.avg_sentiment_score > 0 ? "up" : summary.avg_sentiment_score < 0 ? "down" : "neutral"}
          />
          <StatsCard
            title="Writing Streak"
            value={`${summary.writing_streak || 0} days`}
            subtitle="Keep it up!"
            icon={<Icons.flame className="h-5 w-5" />}
            trend="up"
          />
          <StatsCard
            title="Total Words"
            value={summary.total_words?.toLocaleString() || "0"}
            subtitle="Written this month"
            icon={<Icons.edit className="h-5 w-5" />}
            trend="neutral"
          />
        </div>
      )}

      {/* Top Keywords */}
      {summary?.top_keywords && summary.top_keywords.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Icons.hash className="h-4 w-4" />
              Trending Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.top_keywords.map((keyword, index) => (
                <TagBadge key={index} tag={keyword} size="md" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="all" className="gap-1.5">
            <Icons.list className="h-4 w-4 hidden sm:inline" />
            All
          </TabsTrigger>
          <TabsTrigger value="positive" className="gap-1.5">
            <Icons.trendingUp className="h-4 w-4 hidden sm:inline text-emerald-500" />
            Positive
          </TabsTrigger>
          <TabsTrigger value="challenging" className="gap-1.5">
            <Icons.trendingDown className="h-4 w-4 hidden sm:inline text-rose-500" />
            Challenging
          </TabsTrigger>
          <TabsTrigger value="reflective" className="gap-1.5">
            <Icons.sparkles className="h-4 w-4 hidden sm:inline text-amber-500" />
            Reflective
          </TabsTrigger>
        </TabsList>

        {/* Error Message */}
        {error && (
          <Card className="mt-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Icons.alertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-2 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredInsights.length === 0 ? (
          /* Empty State */
          <Card className="mt-6">
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Icons.brain className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Insights Yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                  {activeTab === "all"
                    ? "Start writing journal entries to receive AI-powered insights and reflections."
                    : `No ${activeTab} insights found. Try a different filter or write more entries.`}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setActiveTab("all")}>
                    View All
                  </Button>
                  <Button onClick={generateNewInsights} disabled={generating}>
                    {generating ? (
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate Insights
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Insights Grid */
          <TabsContent value={activeTab} className="mt-6">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {filteredInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
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
