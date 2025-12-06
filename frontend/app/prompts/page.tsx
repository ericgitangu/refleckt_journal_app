"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ClientOnly } from "@/components/ClientOnly";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { TagBadge } from "@/components/ui/tag-badge";
import { formatRelativeDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Prompt {
  id: string;
  text: string;
  category: string;
  created_at: string;
  tags?: string[];
}

// Category configuration with icons and colors
const CATEGORY_CONFIG: Record<string, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  all: {
    icon: <Icons.list className="h-4 w-4" />,
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
    borderColor: "border-slate-200 dark:border-slate-800",
    description: "Browse all available prompts",
  },
  reflective: {
    icon: <Icons.lightbulb className="h-4 w-4" />,
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    description: "Deep introspection and self-discovery",
  },
  gratitude: {
    icon: <Icons.heart className="h-4 w-4" />,
    color: "text-pink-700 dark:text-pink-300",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    borderColor: "border-pink-200 dark:border-pink-800",
    description: "Appreciation and thankfulness",
  },
  creative: {
    icon: <Icons.sparkles className="h-4 w-4" />,
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    description: "Imagination and creative expression",
  },
  growth: {
    icon: <Icons.trendingUp className="h-4 w-4" />,
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    description: "Personal development and learning",
  },
  mindfulness: {
    icon: <Icons.zap className="h-4 w-4" />,
    color: "text-cyan-700 dark:text-cyan-300",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    borderColor: "border-cyan-200 dark:border-cyan-800",
    description: "Present moment awareness",
  },
};

// Mock data for fallback if API fails
const FALLBACK_PROMPTS: Prompt[] = [
  {
    id: "fallback-reflective-1",
    text: "What was the most meaningful moment of your day, and why did it stand out to you?",
    category: "reflective",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["daily-reflection", "meaning"],
  },
  {
    id: "fallback-growth-1",
    text: "What are you learning about yourself during this current chapter of your life?",
    category: "growth",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["self-discovery", "life-lessons"],
  },
  {
    id: "fallback-creative-1",
    text: "If you could design your ideal living space with no limitations, what would it include and why?",
    category: "creative",
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["imagination", "dreams"],
  },
  {
    id: "fallback-gratitude-1",
    text: "What small, everyday comfort are you most grateful for that you might take for granted?",
    category: "gratitude",
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["appreciation", "mindfulness"],
  },
  {
    id: "fallback-mindfulness-1",
    text: "Take a moment to notice your breathing. How does focusing on your breath for a minute shift your perspective?",
    category: "mindfulness",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["breath", "awareness"],
  },
  {
    id: "fallback-reflective-2",
    text: "What advice would you give to yourself one year ago, and how have your priorities shifted since then?",
    category: "reflective",
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["growth", "perspective"],
  },
];

// Category badge component
function CategoryBadge({ category }: { category: string }) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.all;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
      config.bgColor,
      config.color,
      config.borderColor
    )}>
      {config.icon}
      {category}
    </span>
  );
}

// Prompt Card Component
function PromptCard({
  prompt,
  onUse,
  onRefresh,
  showRefresh = false,
}: {
  prompt: Prompt;
  onUse: (text: string) => void;
  onRefresh?: () => void;
  showRefresh?: boolean;
}) {
  const config = CATEGORY_CONFIG[prompt.category] || CATEGORY_CONFIG.all;

  return (
    <Card className={cn(
      "flex flex-col hover:shadow-md transition-all duration-200",
      "border-l-4",
      config.borderColor.replace("border-", "border-l-")
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CategoryBadge category={prompt.category} />
          {showRefresh && onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              className="h-8 w-8 shrink-0"
              title="Get another prompt"
            >
              <Icons.refresh className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <p className="text-base leading-relaxed">{prompt.text}</p>
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {prompt.tags.map((tag, idx) => (
              <TagBadge key={idx} tag={tag} size="sm" />
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t bg-muted/30 pt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {formatRelativeDate(prompt.created_at)}
        </span>
        <Button
          onClick={() => onUse(prompt.text)}
          size="sm"
          className="gap-1.5"
        >
          <Icons.edit className="h-3.5 w-3.5" />
          Write
        </Button>
      </CardFooter>
    </Card>
  );
}

// Prompts content component
function PromptsContent() {
  const { data: session, status } = useSession();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [dailyPrompt, setDailyPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyPromptLoading, setDailyPromptLoading] = useState(true);
  const [refreshingDaily, setRefreshingDaily] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");

  const fetchDailyPrompt = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshingDaily(true);
    } else {
      setDailyPromptLoading(true);
    }

    try {
      // Use random endpoint for refresh, daily for initial load
      const endpoint = refresh ? "/api/prompts/random" : "/api/prompts/daily";
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.prompt) {
        setDailyPrompt(data.prompt);
        if (refresh) {
          toast({
            title: "New prompt!",
            description: "Here's a fresh writing prompt for you.",
          });
        }
      } else {
        throw new Error("No prompt returned from API");
      }
    } catch (err) {
      console.error("Error fetching daily prompt:", err);

      // Create a fallback prompt
      const today = new Date();
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = dayNames[today.getDay()];

      const weekdayPrompts = [
        `On this ${dayName}, reflect on a challenge you're facing. What small step could you take today to move forward?`,
        `This ${dayName}, consider three things you're grateful for in this season of your life.`,
        `For today's ${dayName} reflection, think about a recent interaction that made an impact on you.`,
        `Take a moment this ${dayName} to notice your surroundings. What beauty have you been overlooking?`,
        `On this ${dayName}, reflect on a goal you've been working toward. What progress have you made?`,
        `For today's ${dayName}, consider how you might bring more joy into your routine.`,
        `This ${dayName}, reflect on someone who has positively influenced your life recently.`,
      ];

      // Use random index for refresh, day-based for initial
      const promptIndex = refresh
        ? Math.floor(Math.random() * weekdayPrompts.length)
        : today.getDay();

      setDailyPrompt({
        id: `fallback-daily-${Date.now()}`,
        text: weekdayPrompts[promptIndex],
        category: "daily",
        created_at: new Date().toISOString(),
        tags: ["reflection", dayName.toLowerCase()],
      });
    } finally {
      setDailyPromptLoading(false);
      setRefreshingDaily(false);
    }
  }, []);

  const fetchPrompts = useCallback(async (categoryName: string) => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = categoryName === "all"
        ? "/api/prompts"
        : `/api/prompts/category/${categoryName}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      console.error("Error fetching prompts:", err);

      // Filter fallback prompts by category
      let filtered = FALLBACK_PROMPTS;
      if (categoryName !== "all") {
        filtered = FALLBACK_PROMPTS.filter(p => p.category === categoryName);

        if (filtered.length === 0) {
          filtered = [{
            id: `fallback-${categoryName}-empty`,
            text: `Take a moment to reflect on ${categoryName} in your life. What patterns do you notice, and what might you want to explore further?`,
            category: categoryName,
            created_at: new Date().toISOString(),
            tags: [categoryName, "reflection"],
          }];
        }
      }

      setPrompts(filtered);
      setError("Using offline prompts. Some features may be limited.");
    } finally {
      setLoading(false);
    }
  }, []);

  const getRandomPromptForCategory = useCallback(async (categoryName: string) => {
    try {
      const response = await fetch(`/api/prompts/random?category=${categoryName}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.prompt) {
        // Replace a random prompt in the current list with the new one
        setPrompts(prev => {
          const newPrompts = [...prev];
          const sameCategory = newPrompts.filter(p => p.category === categoryName);

          if (sameCategory.length > 0) {
            const randomIndex = newPrompts.findIndex(
              p => p.id === sameCategory[Math.floor(Math.random() * sameCategory.length)].id
            );
            if (randomIndex !== -1) {
              newPrompts[randomIndex] = data.prompt;
            }
          } else {
            newPrompts.push(data.prompt);
          }

          return newPrompts;
        });

        toast({
          title: "New prompt added!",
          description: `Fresh ${categoryName} prompt is ready.`,
        });
      }
    } catch (err) {
      console.error("Error getting random prompt:", err);
      toast({
        title: "Couldn't get new prompt",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDailyPrompt();
    }
  }, [status, fetchDailyPrompt]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPrompts(category);
    }
  }, [status, category, fetchPrompts]);

  const applyPrompt = (promptText: string) => {
    window.location.href = `/journal/new?prompt=${encodeURIComponent(promptText)}`;
  };

  if (status === "loading") {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading prompts...</p>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const categories = Object.keys(CATEGORY_CONFIG);

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Icons.messageSquare className="h-8 w-8 text-primary" />
            Writing Prompts
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover inspiration for your next journal entry
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => getRandomPromptForCategory(category === "all" ? "reflective" : category)}
          className="gap-2"
        >
          <Icons.shuffle className="h-4 w-4" />
          Surprise Me
        </Button>
      </div>

      {/* Today's Prompt - Featured Card */}
      <Card className={cn(
        "border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent",
        "relative overflow-hidden"
      )}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <CardHeader className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Icons.sun className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Today&apos;s Prompt</CardTitle>
              </div>
              <CardDescription>
                A fresh prompt to inspire your daily journaling
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchDailyPrompt(true)}
              disabled={refreshingDaily}
              className="gap-1.5"
            >
              {refreshingDaily ? (
                <Icons.spinner className="h-4 w-4 animate-spin" />
              ) : (
                <Icons.refresh className="h-4 w-4" />
              )}
              Get Another
            </Button>
          </div>
        </CardHeader>

        <CardContent className="relative">
          {dailyPromptLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-4/5" />
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ) : dailyPrompt ? (
            <div className="space-y-4">
              <p className="text-lg font-medium leading-relaxed">
                {dailyPrompt.text}
              </p>
              {dailyPrompt.tags && dailyPrompt.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {dailyPrompt.tags.map((tag, idx) => (
                    <TagBadge key={idx} tag={tag} size="md" />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="relative">
          <Button
            onClick={() => dailyPrompt && applyPrompt(dailyPrompt.text)}
            disabled={!dailyPrompt}
            className="gap-2"
          >
            <Icons.edit className="h-4 w-4" />
            Start Writing
          </Button>
        </CardFooter>
      </Card>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={setCategory}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            {categories.map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              return (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="gap-1.5 capitalize data-[state=active]:shadow-sm"
                >
                  {config.icon}
                  <span className="hidden sm:inline">{cat}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchPrompts(category)}
            className="gap-1.5"
          >
            <Icons.refresh className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Category Description */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          {CATEGORY_CONFIG[category]?.description || "Browse prompts"}
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mt-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                <Icons.alertTriangle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prompts Grid */}
        <TabsContent value={category} className="mt-6">
          {loading ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/30 pt-4">
                    <Skeleton className="h-8 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : prompts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Icons.messageSquare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No prompts found</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                    No prompts available for this category. Try another category or refresh.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => setCategory("all")}>
                      View All
                    </Button>
                    <Button onClick={() => fetchPrompts(category)}>
                      <Icons.refresh className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {prompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onUse={applyPrompt}
                  onRefresh={() => getRandomPromptForCategory(prompt.category)}
                  showRefresh={true}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Prompts page with ClientOnly wrapper
export default function PromptsPage() {
  return (
    <ClientOnly>
      <PromptsContent />
    </ClientOnly>
  );
}
