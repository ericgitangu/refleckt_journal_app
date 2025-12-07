"use client";

import { Progress } from "@/components/ui/progress";
import { getLevelProgress, LEVEL_THRESHOLDS } from "@/types/gamification";
import type { GamificationStats } from "@/types/gamification";
import { Trophy, Star } from "lucide-react";

interface LevelProgressProps {
  stats: GamificationStats;
  showTitle?: boolean;
  size?: "sm" | "md" | "lg";
}

export function LevelProgress({
  stats,
  showTitle = true,
  size = "md",
}: LevelProgressProps) {
  const progress = getLevelProgress(stats.lifetime_points ?? 0);
  const currentLevelInfo = LEVEL_THRESHOLDS.find(
    (l) => l.level === (stats.level ?? 1)
  );
  const nextLevelInfo = LEVEL_THRESHOLDS.find(
    (l) => l.level === (stats.level ?? 1) + 1
  );

  const sizeClasses = {
    sm: {
      container: "p-3",
      title: "text-sm",
      icon: "h-4 w-4",
      points: "text-xs",
      progress: "h-2",
    },
    md: {
      container: "p-4",
      title: "text-base",
      icon: "h-5 w-5",
      points: "text-sm",
      progress: "h-3",
    },
    lg: {
      container: "p-6",
      title: "text-lg",
      icon: "h-6 w-6",
      points: "text-base",
      progress: "h-4",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`rounded-lg border bg-card ${classes.container}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Trophy className={`${classes.icon} text-primary`} />
          </div>
          <div>
            <div className={`font-semibold ${classes.title}`}>
              Level {stats.level}
            </div>
            {showTitle && currentLevelInfo && (
              <div className="text-muted-foreground text-xs">
                {currentLevelInfo.title}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Star className="h-4 w-4 text-yellow-500" />
          <span className={classes.points}>
            {(stats.lifetime_points ?? 0).toLocaleString()} pts
          </span>
        </div>
      </div>

      <Progress value={progress} className={classes.progress} />

      <div className="flex justify-between mt-2">
        <span className="text-xs text-muted-foreground">
          {(currentLevelInfo?.min_points ?? 0).toLocaleString()}
        </span>
        {nextLevelInfo ? (
          <span className="text-xs text-muted-foreground">
            {(stats.points_to_next_level ?? 0).toLocaleString()} pts to Level{" "}
            {(stats.level ?? 1) + 1}
          </span>
        ) : (
          <span className="text-xs text-primary font-medium">Max Level!</span>
        )}
        <span className="text-xs text-muted-foreground">
          {nextLevelInfo?.min_points?.toLocaleString() ?? "Max"}
        </span>
      </div>
    </div>
  );
}
