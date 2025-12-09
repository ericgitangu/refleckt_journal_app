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

  // Award points - now just refreshes stats since calculation happens server-side from entries
  const awardPoints = useCallback(
    async (_reason: string, _entryId?: string) => {
      try {
        // Points are now calculated automatically from entries
        // Just refresh stats to get the updated calculation
        await fetchStats();
        const newStats = await gamificationApi.getStats();
        if (newStats.points_balance > (stats?.points_balance || 0)) {
          const pointsGained = newStats.points_balance - (stats?.points_balance || 0);
          toast({
            title: "Points Earned!",
            description: `+${pointsGained} points`,
          });
        }
        return { points: newStats.points_balance };
      } catch (err) {
        console.error("Failed to refresh points:", err);
        // Don't show error toast - stats will update on next page load
        return { points: stats?.points_balance || 0 };
      }
    },
    [fetchStats, stats?.points_balance]
  );

  // Check achievements - now calculates from entries server-side
  const checkAchievements = useCallback(async () => {
    try {
      // Refresh achievements from server (calculated from entries)
      const currentAchievements = await gamificationApi.getAchievements();
      const previouslyUnlocked = stats?.achievements?.filter((a: Achievement) => a.unlocked) || [];
      const newlyUnlocked = currentAchievements.filter(
        (a: Achievement) => a.unlocked && !previouslyUnlocked.some((p: Achievement) => p.id === a.id)
      );

      if (newlyUnlocked.length > 0) {
        // Show toast for each new achievement
        newlyUnlocked.forEach((achievement: Achievement) => {
          toast({
            title: "Achievement Unlocked!",
            description: `${achievement.name}: ${achievement.description}`,
          });
        });
        // Refresh stats to get updated achievements
        await fetchStats();
      }
      return newlyUnlocked;
    } catch (err) {
      console.error("Failed to check achievements:", err);
      return [];
    }
  }, [fetchStats, stats?.achievements]);

  // Update streak - now calculated from entries server-side
  const updateStreak = useCallback(async () => {
    try {
      // Streak is calculated automatically from entries
      // Just refresh to get the latest calculation
      await fetchStats();
      return { current_streak: stats?.current_streak || 0, longest_streak: stats?.longest_streak || 0 };
    } catch (err) {
      console.error("Failed to update streak:", err);
      return { current_streak: 0, longest_streak: 0 };
    }
  }, [fetchStats, stats?.current_streak, stats?.longest_streak]);

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
