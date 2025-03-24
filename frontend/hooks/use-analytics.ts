import { useState, useEffect } from "react";
import { analyticsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { AnalyticsData, MoodData } from "@/types/api";

// Helper function to transform mood data from API to MoodData type
function transformMoods(data: { date: string; value: number }[]): MoodData[] {
  return data.map((item, index) => ({
    id: `mood-${index}`,
    entry_id: `entry-${index}`,
    mood: item.value.toString(),
    confidence: 1.0,
    created_at: item.date,
  }));
}

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [moods, setMoods] = useState<MoodData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setIsLoading(true);
        const data = await analyticsApi.getAll();
        setAnalytics(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
        setError("Failed to load analytics. Please try again later.");
        toast({
          title: "Error",
          description: "Failed to load analytics",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  useEffect(() => {
    async function fetchMoods() {
      try {
        setIsLoading(true);
        const data = await analyticsApi.getMood();
        setMoods(transformMoods(data.moods));
        setError(null);
      } catch (err) {
        console.error("Failed to fetch mood data:", err);
        setError("Failed to load mood data. Please try again later.");
        toast({
          title: "Error",
          description: "Failed to load mood data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchMoods();
  }, []);

  const requestAnalyticsGeneration = async () => {
    try {
      setIsLoading(true);
      await analyticsApi.requestAnalysis();
      toast({
        title: "Success",
        description:
          "Analytics generation started. This may take a few minutes.",
      });
      // Refresh analytics after a short delay
      setTimeout(() => {
        analyticsApi.getAll().then((data) => setAnalytics(data));
      }, 5000);
    } catch (err) {
      console.error("Failed to request analytics generation:", err);
      toast({
        title: "Error",
        description: "Failed to request analytics generation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    analytics,
    moods,
    isLoading,
    error,
    requestAnalyticsGeneration,
  };
}
