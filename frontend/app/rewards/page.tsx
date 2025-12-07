"use client";

import { useGamification } from "@/hooks/use-gamification";
import {
  LevelProgress,
  StreakDisplay,
  AchievementCard,
} from "@/components/gamification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Star,
  Trophy,
  Flame,
  BookOpen,
  Clock,
  AlertCircle,
  ChevronLeft,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { ACHIEVEMENTS_CONFIG, POINTS_CONFIG } from "@/types/gamification";
import type { PointsTransaction } from "@/types/gamification";

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function PointsHistoryItem({ transaction }: { transaction: PointsTransaction }) {
  const reasonIcons: Record<string, React.ReactNode> = {
    entry_created: <BookOpen className="h-4 w-4" />,
    streak_continued: <Flame className="h-4 w-4 text-orange-500" />,
    streak_milestone: <Trophy className="h-4 w-4 text-yellow-500" />,
    ai_insights: <Star className="h-4 w-4 text-purple-500" />,
    achievement_unlocked: <Trophy className="h-4 w-4 text-primary" />,
    prompt_used: <BookOpen className="h-4 w-4 text-blue-500" />,
    entry_word_bonus: <Star className="h-4 w-4 text-green-500" />,
    first_entry_of_day: <Star className="h-4 w-4 text-yellow-500" />,
    level_up: <Trophy className="h-4 w-4 text-primary" />,
  };

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-muted">
          {reasonIcons[transaction.reason] || <Star className="h-4 w-4" />}
        </div>
        <div>
          <div className="font-medium text-sm">{transaction.description}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(transaction.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
      <div className="font-semibold text-primary">+{transaction.amount}</div>
    </div>
  );
}

export default function RewardsPage() {
  const { stats, transactions, isLoading, error, refresh } = useGamification();

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/journal" className="flex items-center text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Journal</span>
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-6">Rewards & Achievements</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/journal" className="flex items-center text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Journal</span>
          </Link>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Failed to load gamification data"}
          </AlertDescription>
          <Button variant="outline" className="mt-4" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </Alert>
      </div>
    );
  }

  const unlockedAchievements = stats.achievements.filter((a) => a.unlocked);
  const lockedAchievements = stats.achievements.filter((a) => !a.unlocked);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/journal" className="flex items-center text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Journal</span>
          </Link>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-2">Rewards & Achievements</h1>
      <p className="text-muted-foreground mb-6">
        Track your journaling progress and unlock achievements
      </p>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
            <div className="text-2xl font-bold">
              {stats.points_balance.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Points</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{stats.level}</div>
            <div className="text-xs text-muted-foreground">{stats.level_title}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-6 w-6 mx-auto text-orange-500 mb-2" />
            <div className="text-2xl font-bold">{stats.current_streak}</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{stats.total_entries}</div>
            <div className="text-xs text-muted-foreground">Total Entries</div>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <div className="mb-6">
        <LevelProgress stats={stats} size="lg" />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="streak">Streak</TabsTrigger>
          <TabsTrigger value="history">Points History</TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="mt-4">
          {/* Unlocked Achievements */}
          {unlockedAchievements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Unlocked ({unlockedAchievements.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {unlockedAchievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    size="md"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Locked Achievements */}
          {lockedAchievements.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                In Progress ({lockedAchievements.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {lockedAchievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    size="md"
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Streak Tab */}
        <TabsContent value="streak" className="mt-4">
          <StreakDisplay stats={stats} />
        </TabsContent>

        {/* Points History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div>
                  {transactions.map((tx) => (
                    <PointsHistoryItem key={tx.id} transaction={tx} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No points earned yet.</p>
                  <p className="text-sm">
                    Start journaling to earn your first points!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Points Guide */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">How to Earn Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Journal Entries</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Create entry: +{POINTS_CONFIG.entry_created} pts</li>
                    <li>100+ words: +{POINTS_CONFIG.word_bonus_100} pts</li>
                    <li>300+ words: +{POINTS_CONFIG.word_bonus_300} pts</li>
                    <li>500+ words: +{POINTS_CONFIG.word_bonus_500} pts</li>
                    <li>First entry of day: +{POINTS_CONFIG.first_entry_of_day} pts</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Streaks & Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Daily streak: +{POINTS_CONFIG.streak_continued} pts</li>
                    <li>7-day streak: +{POINTS_CONFIG.streak_7_days} pts</li>
                    <li>30-day streak: +{POINTS_CONFIG.streak_30_days} pts</li>
                    <li>AI insights: +{POINTS_CONFIG.ai_insights} pts</li>
                    <li>Use prompt: +{POINTS_CONFIG.prompt_used} pts</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
