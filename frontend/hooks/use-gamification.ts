import { useState, useEffect, useCallback } from "react";
import { gamificationApi } from "@/lib/api/gamification";
import { toast } from "@/hooks/use-toast";
import type {
  GamificationStats,
  PointsTransaction,
  Achievement,
} from "@/types/gamification";

export function useGamification() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await gamificationApi.getStats();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch gamification stats:", err);
      setError("Failed to load gamification data. Please try again later.");
      toast({
        title: "Error",
        description: "Failed to load gamification stats",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (limit: number = 20) => {
    try {
      const data = await gamificationApi.getTransactions(limit);
      setTransactions(data);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchTransactions();
  }, [fetchStats, fetchTransactions]);

  const awardPoints = useCallback(
    async (reason: string, entryId?: string) => {
      try {
        const result = await gamificationApi.awardPoints(reason, entryId);
        // Refresh stats after awarding points
        await fetchStats();
        toast({
          title: "Points Earned!",
          description: `+${result.points} points`,
        });
        return result;
      } catch (err) {
        console.error("Failed to award points:", err);
        toast({
          title: "Error",
          description: "Failed to award points",
          variant: "destructive",
        });
        throw err;
      }
    },
    [fetchStats]
  );

  const checkAchievements = useCallback(async () => {
    try {
      const newAchievements = await gamificationApi.checkAchievements();
      if (newAchievements.length > 0) {
        // Show toast for each new achievement
        newAchievements.forEach((achievement) => {
          toast({
            title: "Achievement Unlocked!",
            description: `${achievement.name}: ${achievement.description}`,
          });
        });
        // Refresh stats to get updated achievements
        await fetchStats();
      }
      return newAchievements;
    } catch (err) {
      console.error("Failed to check achievements:", err);
      return [];
    }
  }, [fetchStats]);

  const updateStreak = useCallback(async () => {
    try {
      const streakData = await gamificationApi.updateStreak();
      // Refresh stats to get updated streak
      await fetchStats();
      return streakData;
    } catch (err) {
      console.error("Failed to update streak:", err);
      throw err;
    }
  }, [fetchStats]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchStats(), fetchTransactions()]);
  }, [fetchStats, fetchTransactions]);

  return {
    stats,
    transactions,
    isLoading,
    error,
    awardPoints,
    checkAchievements,
    updateStreak,
    refresh,
  };
}

// Hook for just displaying points in header/sidebar
export function usePointsBadge() {
  const [points, setPoints] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [streak, setStreak] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBasicStats() {
      try {
        setIsLoading(true);
        const data = await gamificationApi.getStats();
        setPoints(data.points_balance);
        setLevel(data.level);
        setStreak(data.current_streak);
      } catch (err) {
        console.error("Failed to fetch points:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBasicStats();
  }, []);

  return { points, level, streak, isLoading };
}
