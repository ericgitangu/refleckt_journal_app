"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Achievement } from "@/types/gamification";
import {
  Flame,
  Book,
  Library,
  Type,
  BookOpen,
  Sparkles,
  Brain,
  MessageSquare,
  Smile,
  Star,
  Trophy,
  Pencil,
  Lock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AchievementCardProps {
  achievement: Achievement;
  size?: "sm" | "md" | "lg";
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: Flame,
  book: Book,
  library: Library,
  type: Type,
  "book-open": BookOpen,
  sparkles: Sparkles,
  brain: Brain,
  "message-square": MessageSquare,
  smile: Smile,
  star: Star,
  trophy: Trophy,
  pencil: Pencil,
};

export function AchievementCard({
  achievement,
  size = "md",
}: AchievementCardProps) {
  const Icon = iconMap[achievement.icon] || Star;

  const sizeClasses = {
    sm: {
      card: "p-2",
      icon: "h-6 w-6",
      iconContainer: "p-2",
      title: "text-xs",
      description: "text-[10px]",
      points: "text-[10px]",
    },
    md: {
      card: "p-3",
      icon: "h-8 w-8",
      iconContainer: "p-3",
      title: "text-sm font-medium",
      description: "text-xs",
      points: "text-xs",
    },
    lg: {
      card: "p-4",
      icon: "h-10 w-10",
      iconContainer: "p-4",
      title: "text-base font-semibold",
      description: "text-sm",
      points: "text-sm",
    },
  };

  const classes = sizeClasses[size];

  const progress =
    achievement.progress !== undefined
      ? Math.min((achievement.progress / achievement.requirement) * 100, 100)
      : achievement.unlocked
        ? 100
        : 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={`relative overflow-hidden transition-all ${
              achievement.unlocked
                ? "hover:shadow-md cursor-pointer"
                : "opacity-60"
            } ${classes.card}`}
          >
            {!achievement.unlocked && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            <CardContent className="p-0 flex flex-col items-center text-center">
              <div
                className={`rounded-full mb-2 ${classes.iconContainer} ${
                  achievement.unlocked
                    ? "bg-primary/10"
                    : "bg-muted"
                }`}
              >
                <Icon
                  className={`${classes.icon} ${
                    achievement.unlocked
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </div>

              <h4 className={classes.title}>{achievement.name}</h4>

              {size !== "sm" && (
                <p className={`text-muted-foreground mt-1 ${classes.description}`}>
                  {achievement.description}
                </p>
              )}

              {!achievement.unlocked && achievement.progress !== undefined && (
                <div className="w-full mt-2">
                  <Progress value={progress} className="h-1" />
                  <p className={`text-muted-foreground mt-1 ${classes.points}`}>
                    {achievement.progress}/{achievement.requirement}
                  </p>
                </div>
              )}

              {achievement.unlocked && (
                <div className={`text-primary font-medium mt-1 ${classes.points}`}>
                  +{achievement.points} pts
                </div>
              )}
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{achievement.name}</p>
            <p className="text-xs text-muted-foreground">
              {achievement.description}
            </p>
            {achievement.unlocked && achievement.unlocked_at && (
              <p className="text-xs text-primary mt-1">
                Unlocked{" "}
                {new Date(achievement.unlocked_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
