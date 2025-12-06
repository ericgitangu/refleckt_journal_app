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
import { TagBadge } from "@/components/ui/tag-badge";
import { formatChartDate, formatSimpleDate } from "@/lib/date-utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  BookOpen,
  Brain,
  Target,
  Flame,
  RefreshCw,
  Sparkles,
  BarChart3,
  PieChartIcon,
  Clock,
} from "lucide-react";
import axios from "axios";

// Types
interface AnalyticsData {
  entry_count: number;
  entry_frequency: Array<{ date: string; count: number }>;
  category_distribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  mood_trends: Array<{
    date: string;
    average_sentiment: number;
    entry_count: number;
  }>;
  writing_patterns: Array<{ hour_of_day: number; count: number }>;
  word_count_average: number;
  top_keywords: string[];
  longest_streak_days: number;
  current_streak_days: number;
}

// Chart colors for themes
const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  muted: "hsl(var(--muted))",
  accent: "hsl(var(--accent))",
};

const PIE_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold mt-2">{value}</h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div
                className={`flex items-center gap-1 mt-2 text-sm ${
                  trend === "up"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : trend === "down"
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                }`}
              >
                {trend === "up" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : trend === "down" ? (
                  <TrendingDown className="h-4 w-4" />
                ) : null}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-full bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function AnalyticsSkeleton() {
  return (
    <div className="container py-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Analytics content component
function AnalyticsContent() {
  const { data: session, status } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("month");

  const fetchAnalytics = useCallback(async (period: string, showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await axios.get(`/api/analytics?time_period=${period}`);
      setAnalytics(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("Please sign in to view your analytics");
      } else {
        setError("Unable to load analytics. Your data will appear here once you have journal entries.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchAnalytics(timeRange);
    }
  }, [status, timeRange, fetchAnalytics]);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    fetchAnalytics(value, true);
  };

  if (status === "loading") {
    return <AnalyticsSkeleton />;
  }

  if (!session) {
    redirect("/login");
  }

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  // Format writing patterns for chart
  const writingPatternData = analytics?.writing_patterns?.map((p) => ({
    hour: `${p.hour_of_day}:00`,
    entries: p.count,
  })) || [];

  // Format mood trend data
  const moodTrendData = analytics?.mood_trends?.map((m) => ({
    date: formatChartDate(m.date),
    sentiment: Math.round(m.average_sentiment * 100),
    entries: m.entry_count,
  })) || [];

  // Format entry frequency data
  const entryFrequencyData = analytics?.entry_frequency?.map((f) => ({
    date: formatChartDate(f.date),
    entries: f.count,
  })) || [];

  return (
    <div className="container py-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            Understand your journaling patterns with AI-powered analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchAnalytics(timeRange, true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Tabs value={timeRange} onValueChange={handleTimeRangeChange}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No analytics yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => fetchAnalytics(timeRange, true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : analytics ? (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Entries"
              value={analytics.entry_count || 0}
              subtitle={`in the last ${timeRange}`}
              icon={BookOpen}
              trend="up"
              trendValue="Active writer"
            />
            <StatCard
              title="Current Streak"
              value={`${analytics.current_streak_days || 0} days`}
              subtitle={`Best: ${analytics.longest_streak_days || 0} days`}
              icon={Flame}
              trend={analytics.current_streak_days > 0 ? "up" : "neutral"}
              trendValue={analytics.current_streak_days > 0 ? "Keep it going!" : "Start writing"}
            />
            <StatCard
              title="Avg Words/Entry"
              value={analytics.word_count_average || 0}
              subtitle="words per entry"
              icon={Target}
            />
            <StatCard
              title="Writing Time"
              value={
                writingPatternData.length > 0
                  ? writingPatternData.reduce((max, p) =>
                      p.entries > max.entries ? p : max
                    ).hour
                  : "N/A"
              }
              subtitle="Most productive hour"
              icon={Clock}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Entry Frequency Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Writing Frequency
                </CardTitle>
                <CardDescription>Entries over time</CardDescription>
              </CardHeader>
              <CardContent>
                {entryFrequencyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={entryFrequencyData}>
                      <defs>
                        <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="entries"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorEntries)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Write more entries to see your frequency patterns
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mood Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Mood Trends
                </CardTitle>
                <CardDescription>AI-analyzed sentiment over time</CardDescription>
              </CardHeader>
              <CardContent>
                {moodTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={moodTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis
                        domain={[-100, 100]}
                        className="text-xs"
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`${value}%`, "Sentiment"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="sentiment"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: "#10b981" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    AI will analyze your mood patterns as you write
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Categories
                </CardTitle>
                <CardDescription>Entry distribution by category</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.category_distribution &&
                analytics.category_distribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={analytics.category_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="category"
                      >
                        {analytics.category_distribution.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    Add categories to your entries
                  </div>
                )}
                {analytics.category_distribution &&
                  analytics.category_distribution.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {analytics.category_distribution.map((cat, idx) => (
                        <div
                          key={cat.category}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                              }}
                            />
                            <span>{cat.category}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {cat.count} ({cat.percentage.toFixed(0)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Writing Patterns by Hour */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Writing Patterns
                </CardTitle>
                <CardDescription>When you write most</CardDescription>
              </CardHeader>
              <CardContent>
                {writingPatternData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={writingPatternData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="hour" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="entries" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    Write more to discover your patterns
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Keywords */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Top Keywords
                </CardTitle>
                <CardDescription>AI-extracted themes from your entries</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.top_keywords && analytics.top_keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analytics.top_keywords.map((keyword) => (
                      <TagBadge key={keyword} tag={keyword} size="md" />
                    ))}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    Keywords will appear as you write more
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Insights Summary */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">AI Summary</h3>
                  <p className="text-muted-foreground">
                    {analytics.entry_count > 0 ? (
                      <>
                        You&apos;ve written <strong>{analytics.entry_count} entries</strong> this {timeRange}.
                        {analytics.current_streak_days > 0 && (
                          <> You&apos;re on a <strong>{analytics.current_streak_days}-day streak</strong>!</>
                        )}
                        {analytics.word_count_average > 0 && (
                          <> Your entries average <strong>{analytics.word_count_average} words</strong>.</>
                        )}
                        {moodTrendData.length > 0 && (
                          <>
                            {" "}Your overall sentiment trend is{" "}
                            <strong>
                              {moodTrendData[moodTrendData.length - 1]?.sentiment > 0
                                ? "positive"
                                : moodTrendData[moodTrendData.length - 1]?.sentiment < 0
                                ? "reflective"
                                : "balanced"}
                            </strong>.
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        Start writing journal entries to unlock AI-powered insights about your
                        writing patterns, mood trends, and personal growth.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

// Analytics page with ClientOnly wrapper
export default function AnalyticsPage() {
  return (
    <ClientOnly>
      <AnalyticsContent />
    </ClientOnly>
  );
}
