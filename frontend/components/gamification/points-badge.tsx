"use client";

import { usePointsBadge } from "@/hooks/use-gamification";
import { Badge } from "@/components/ui/badge";
import { Flame, Star, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PointsBadgeProps {
  showStreak?: boolean;
  showLevel?: boolean;
  compact?: boolean;
}

export function PointsBadge({
  showStreak = true,
  showLevel = true,
  compact = false,
}: PointsBadgeProps) {
  const { points, level, streak, isLoading } = usePointsBadge();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        {showStreak && <Skeleton className="h-6 w-12 rounded-full" />}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Link href="/rewards" className="flex items-center gap-2">
        {/* Points */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 transition-colors"
            >
              <Star className="h-3 w-3 mr-1 text-yellow-500" />
              {compact ? points : `${points} pts`}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{points} points - Click to view rewards</p>
          </TooltipContent>
        </Tooltip>

        {/* Level */}
        {showLevel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors"
              >
                <Trophy className="h-3 w-3 mr-1 text-primary" />
                {compact ? `L${level}` : `Level ${level}`}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Level {level} - Click to view progress</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Streak */}
        {showStreak && streak > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={`cursor-pointer transition-colors ${
                  streak >= 7
                    ? "border-orange-500 text-orange-600"
                    : "hover:bg-accent"
                }`}
              >
                <Flame
                  className={`h-3 w-3 mr-1 ${
                    streak >= 7 ? "text-orange-500" : "text-muted-foreground"
                  }`}
                />
                {streak}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{streak} day streak!</p>
            </TooltipContent>
          </Tooltip>
        )}
      </Link>
    </TooltipProvider>
  );
}
