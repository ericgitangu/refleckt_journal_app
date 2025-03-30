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
    id: 'fallback-1',
    text: "What was the most meaningful moment of your day, and why did it stand out to you?",
    category: 'reflective',
    created_at: new Date().toISOString(),
    tags: ['daily-reflection', 'meaning']
  },
  {
    id: 'fallback-2',
    text: "What are you learning about yourself during this current chapter of your life?",
    category: 'growth',
    created_at: new Date().toISOString(),
    tags: ['self-discovery', 'life-lessons']
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
      
      // Use fallback data instead of showing nothing
      setPrompts(FALLBACK_PROMPTS);
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
      setDailyPrompt(data.prompt || null);
      setDailyPromptError(null);
    } catch (err) {
      console.error("Error fetching daily prompt:", err);
      // Still set a fallback daily prompt
      setDailyPrompt({
        id: 'fallback-daily',
        text: "What emotions are most present for you today, and how are they influencing your thoughts and actions?",
        category: 'mindfulness',
        created_at: new Date().toISOString(),
        tags: ['emotions', 'self-awareness']
      });
      setDailyPromptError("Could not load today's prompt. Showing a fallback prompt instead.");
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
      
      // Use fallback data instead of showing nothing
      setPrompts(FALLBACK_PROMPTS);
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
              <CardTitle>Today&apos;s Prompt</CardTitle>
              <CardDescription>A fresh prompt to inspire your daily journaling</CardDescription>
              {dailyPromptError && (
                <div className="text-amber-500 text-sm flex items-center mt-2">
                  <Icons.alertTriangle className="h-3 w-3 mr-1" />
                  {dailyPromptError}
                </div>
              )}
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