"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Calendar, Trophy } from "lucide-react";
import type { GamificationStats } from "@/types/gamification";

interface StreakDisplayProps {
  stats: GamificationStats;
  compact?: boolean;
}

export function StreakDisplay({ stats, compact = false }: StreakDisplayProps) {
  const { current_streak, longest_streak, last_entry_date } = stats;

  // Calculate streak milestone progress
  const nextMilestone =
    current_streak < 3
      ? 3
      : current_streak < 7
        ? 7
        : current_streak < 30
          ? 30
          : current_streak < 100
            ? 100
            : null;

  const daysToNextMilestone = nextMilestone
    ? nextMilestone - current_streak
    : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
        <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
          <Flame className="h-6 w-6 text-orange-500" />
        </div>
        <div>
          <div className="text-2xl font-bold">{current_streak}</div>
          <div className="text-sm text-muted-foreground">Day Streak</div>
        </div>
        {nextMilestone && (
          <div className="ml-auto text-right">
            <div className="text-sm font-medium">{daysToNextMilestone} days</div>
            <div className="text-xs text-muted-foreground">
              to {nextMilestone}-day badge
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Journaling Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Current Streak */}
          <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30">
            <div className="flex justify-center mb-2">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {current_streak}
            </div>
            <div className="text-sm text-muted-foreground">Current Streak</div>
            {current_streak > 0 && (
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                {current_streak === 1 ? "day" : "days"} in a row!
              </div>
            )}
          </div>

          {/* Longest Streak */}
          <div className="text-center p-4 rounded-lg bg-muted/50 border">
            <div className="flex justify-center mb-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold">{longest_streak}</div>
            <div className="text-sm text-muted-foreground">Best Streak</div>
            {longest_streak > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Personal record
              </div>
            )}
          </div>
        </div>

        {/* Next Milestone */}
        {nextMilestone && current_streak > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-dashed">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Next milestone</span>
              </div>
              <div className="text-sm">
                <span className="font-medium">{daysToNextMilestone} days</span>
                <span className="text-muted-foreground">
                  {" "}
                  to {nextMilestone}-day badge
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Last Entry */}
        {last_entry_date && (
          <div className="mt-3 text-xs text-center text-muted-foreground">
            Last entry:{" "}
            {new Date(last_entry_date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </div>
        )}

        {/* Encouragement message */}
        {current_streak === 0 && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 text-center">
            <p className="text-sm text-muted-foreground">
              Start a new streak by writing today!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
