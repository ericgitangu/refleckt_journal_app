"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ClientOnly } from "@/components/ClientOnly";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { AnalyticsData, getAnalyticsSummary } from "@/lib/services/analytics-service";

// Analytics content component that uses React hooks
function AnalyticsContent() {
  const { data: session, status } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("month");

  useEffect(() => {
    if (status === "authenticated") {
      fetchAnalytics(timeRange);
    }
  }, [status, timeRange]);

  const fetchAnalytics = async (period: string) => {
    setLoading(true);
    try {
      const data = await getAnalyticsSummary(period);
      setAnalytics(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("Failed to load analytics data. Please try again later.");
    } finally {
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
        <h1 className="text-3xl font-bold">Analytics</h1>
      </div>

      <Tabs defaultValue="month" className="mb-6">
        <TabsList>
          <TabsTrigger value="week" onClick={() => setTimeRange("week")}>
            Last Week
          </TabsTrigger>
          <TabsTrigger value="month" onClick={() => setTimeRange("month")}>
            Last Month
          </TabsTrigger>
          <TabsTrigger value="year" onClick={() => setTimeRange("year")}>
            Last Year
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-destructive">{error}</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Writing Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {analytics ? (
                  `You've written ${analytics.entry_count || 0} entries in this period.`
                ) : (
                  "Start writing to see your analytics!"
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Create entries with categories to see distributions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mood Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                AI will analyze your entries to show mood patterns.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Writing Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Track when and how much you write.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
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