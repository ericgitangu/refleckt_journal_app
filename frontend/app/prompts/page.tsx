"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ClientOnly } from "@/components/ClientOnly";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Prompt {
  id: string;
  text: string;
  category: string;
  created_at: string;
  tags?: string[];
}

// Mock data for fallback if API fails
const FALLBACK_PROMPTS: Prompt[] = [
  {
    id: 'fallback-reflective-1',
    text: "What was the most meaningful moment of your day, and why did it stand out to you?",
    category: 'reflective',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['daily-reflection', 'meaning']
  },
  {
    id: 'fallback-growth-1',
    text: "What are you learning about yourself during this current chapter of your life?",
    category: 'growth',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['self-discovery', 'life-lessons']
  },
  {
    id: 'fallback-creative-1',
    text: "If you could design your ideal living space with no limitations, what would it include and why?",
    category: 'creative',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['imagination', 'dreams']
  },
  {
    id: 'fallback-gratitude-1',
    text: "What small, everyday comfort are you most grateful for that you might take for granted?",
    category: 'gratitude',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['appreciation', 'mindfulness']
  },
  {
    id: 'fallback-mindfulness-1',
    text: "Take a moment to notice your breathing. How does focusing on your breath for a minute shift your perspective?",
    category: 'mindfulness',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['breath', 'awareness']
  },
  {
    id: 'fallback-reflective-2',
    text: "What advice would you give to yourself one year ago, and how have your priorities shifted since then?",
    category: 'reflective',
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['growth', 'perspective']
  }
];

// Prompts content component that uses React hooks
function PromptsContent() {
  const { data: session, status } = useSession();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [dailyPrompt, setDailyPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyPromptLoading, setDailyPromptLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyPromptError, setDailyPromptError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDailyPrompt();
    }
  }, [status, retryCount]);

  useEffect(() => {
    if (status === "authenticated" && category !== "all") {
      fetchPromptsByCategory(category);
    } else if (status === "authenticated") {
      fetchPrompts();
    }
  }, [status, category, retryCount]);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prompts');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      setPrompts(data.prompts || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching prompts:", err);
      
      // Ensure we have prompts from all categories in the fallbacks
      const categorySet = new Set(FALLBACK_PROMPTS.map(prompt => prompt.category));
      const allCategories = ["reflective", "gratitude", "creative", "growth", "mindfulness"];
      
      // For any missing categories, add a default prompt
      let enhancedFallbacks = [...FALLBACK_PROMPTS];
      
      allCategories.forEach(category => {
        if (!categorySet.has(category)) {
          enhancedFallbacks.push({
            id: `fallback-${category}-auto`,
            text: `Take a moment to reflect on ${category} in your life. What patterns do you notice, and what might you want to explore further?`,
            category: category,
            created_at: new Date().toISOString(),
            tags: [category, 'reflection']
          });
        }
      });
      
      // Ensure we have at least 6 prompts for a good grid display
      if (enhancedFallbacks.length < 6) {
        const additionalNeeded = 6 - enhancedFallbacks.length;
        for (let i = 0; i < additionalNeeded; i++) {
          const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)];
          enhancedFallbacks.push({
            id: `fallback-additional-${i}`,
            text: `What does ${randomCategory} mean to you personally? How has your understanding of it evolved over time?`,
            category: randomCategory,
            created_at: new Date().toISOString(),
            tags: [randomCategory, 'personal-meaning']
          });
        }
      }
      
      // Use the enhanced fallbacks
      setPrompts(enhancedFallbacks);
      setError("Failed to load prompts. Showing generic prompts instead.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyPrompt = async () => {
    setDailyPromptLoading(true);
    try {
      const response = await fetch('/api/prompts/daily');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.prompt) {
        setDailyPrompt(data.prompt);
        setDailyPromptError(null);
      } else {
        // Handle case where the API returns no prompt
        throw new Error("No prompt returned from API");
      }
    } catch (err) {
      console.error("Error fetching daily prompt:", err);
      
      // Create a high-quality fallback prompt based on current day
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[today.getDay()];
      
      // Generate a different prompt based on the day of the week
      // This ensures variety even if the API consistently fails
      const weekdayPrompts = [
        `On this ${dayName}, reflect on a challenge you're facing. What small step could you take today to move forward?`,
        `This ${dayName}, consider three things you're grateful for in this season of your life.`,
        `For today's ${dayName} reflection, think about a recent interaction that made an impact on you.`,
        `Take a moment this ${dayName} to notice your surroundings. What beauty have you been overlooking?`,
        `On this ${dayName}, reflect on a goal you've been working toward. What progress have you made?`,
        `For today's ${dayName}, consider how you might bring more joy into your routine.`,
        `This ${dayName}, reflect on someone who has positively influenced your life recently.`
      ];
      
      // Use the day of the week to pick a prompt
      const promptText = weekdayPrompts[today.getDay()];
      
      // Set a quietly fail fallback - user sees a normal prompt but we know it's a fallback
      setDailyPrompt({
        id: 'fallback-daily',
        text: promptText,
        category: 'daily',
        created_at: new Date().toISOString(),
        tags: ['reflection', dayName.toLowerCase()]
      });
      
      // Set a subtle error flag but don't make it disruptive
      setDailyPromptError("Using offline prompt");
    } finally {
      setDailyPromptLoading(false);
    }
  };

  const fetchPromptsByCategory = async (categoryName: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/prompts/category/${categoryName}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      setPrompts(data.prompts || []);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${categoryName} prompts:`, err);
      
      // Filter fallback prompts by selected category
      let filteredPrompts = FALLBACK_PROMPTS;
      if (categoryName !== 'all') {
        filteredPrompts = FALLBACK_PROMPTS.filter(prompt => 
          prompt.category === categoryName
        );
        
        // If no fallbacks for this category, show at least one general fallback
        if (filteredPrompts.length === 0) {
          filteredPrompts = [{
            id: `fallback-${categoryName}-empty`,
            text: `What experiences in your life relate to ${categoryName}? Take a moment to reflect on how this theme appears in your daily life.`,
            category: categoryName,
            created_at: new Date().toISOString(),
            tags: [categoryName, 'reflection']
          }];
        }
      }
      
      setPrompts(filteredPrompts);
      setError(`Failed to load ${categoryName} prompts. Showing generic prompts instead.`);
    } finally {
      setLoading(false);
    }
  };

  const applyPrompt = (promptText: string) => {
    window.location.href = `/journal/new?prompt=${encodeURIComponent(promptText)}`;
  };
  
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    // Also retry fetching the daily prompt
    fetchDailyPrompt();
  };

  if (status === "loading") {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const categories = ["all", "reflective", "gratitude", "creative", "growth", "mindfulness"];

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Writing Prompts</h1>
        {error && (
          <Button variant="outline" onClick={handleRetry} size="sm">
            <Icons.refresh className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
      </div>

      {dailyPromptLoading ? (
        <Card className="mb-6 border-2 border-primary/20">
          <CardHeader>
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-5 w-4/5" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      ) : (
        dailyPrompt && (
          <Card className="mb-6 border-2 border-primary/20">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Today&apos;s Prompt</CardTitle>
                  <CardDescription>A fresh prompt to inspire your daily journaling</CardDescription>
                </div>
                {dailyPromptError && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => fetchDailyPrompt()} 
                    className="h-8 w-8"
                    title="Try again"
                  >
                    <Icons.refresh className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{dailyPrompt.text}</p>
              {dailyPrompt.tags && dailyPrompt.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {dailyPrompt.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={() => applyPrompt(dailyPrompt.text)}>
                Use This Prompt
              </Button>
            </CardFooter>
          </Card>
        )
      )}

      <Tabs defaultValue="all" className="mb-6">
        <TabsList className="mb-4">
          {categories.map((cat) => (
            <TabsTrigger 
              key={cat} 
              value={cat} 
              onClick={() => setCategory(cat)}
              className="capitalize"
            >
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-amber-500 flex items-center">
              <Icons.alertTriangle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-5 w-20 mb-2" />
              </CardHeader>
              <CardContent className="flex-grow">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
              <CardFooter className="border-t bg-muted/50 pt-4">
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : prompts.length === 0 ? (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Icons.messageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No prompts available</h3>
              <p className="text-muted-foreground mb-4">
                No prompts found for this category. Try another category.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="capitalize mb-2">
                    {prompt.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p>{prompt.text}</p>
                {prompt.tags && prompt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {prompt.tags.map((tag, idx) => (
                      <span key={idx} className="text-xs text-muted-foreground">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t bg-muted/50 pt-4">
                <Button variant="secondary" onClick={() => applyPrompt(prompt.text)} className="w-full">
                  Use Prompt
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
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