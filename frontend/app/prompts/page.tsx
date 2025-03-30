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

interface Prompt {
  id: string;
  text: string;
  category: string;
  created_at: string;
  tags?: string[];
}

// Prompts content component that uses React hooks
function PromptsContent() {
  const { data: session, status } = useSession();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [dailyPrompt, setDailyPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    if (status === "authenticated") {
      fetchPrompts();
      fetchDailyPrompt();
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && category !== "all") {
      fetchPromptsByCategory(category);
    } else if (status === "authenticated") {
      fetchPrompts();
    }
  }, [status, category]);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prompts');
      if (!response.ok) {
        throw new Error("Failed to fetch prompts");
      }
      const data = await response.json();
      setPrompts(data.prompts || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching prompts:", err);
      setError("Failed to load prompts. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyPrompt = async () => {
    try {
      const response = await fetch('/api/prompts/daily');
      if (!response.ok) {
        throw new Error("Failed to fetch daily prompt");
      }
      const data = await response.json();
      setDailyPrompt(data.prompt || null);
    } catch (err) {
      console.error("Error fetching daily prompt:", err);
      // We don't set the main error state here since this is secondary content
    }
  };

  const fetchPromptsByCategory = async (categoryName: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/prompts/category/${categoryName}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${categoryName} prompts`);
      }
      const data = await response.json();
      setPrompts(data.prompts || []);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${categoryName} prompts:`, err);
      setError(`Failed to load ${categoryName} prompts. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  const applyPrompt = (promptText: string) => {
    // Redirect to new journal entry with the prompt
    // We'll implement this later when creating the new entry page
    window.location.href = `/journal/new?prompt=${encodeURIComponent(promptText)}`;
  };

  if (status === "loading" || loading) {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const categories = ["all", "reflective", "gratitude", "creative", "growth"];

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Writing Prompts</h1>
      </div>

      {dailyPrompt && (
        <Card className="mb-6 border-2 border-primary/20">
          <CardHeader>
            <CardTitle>Today&apos;s Prompt</CardTitle>
            <CardDescription>A fresh prompt to inspire your daily journaling</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{dailyPrompt.text}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => applyPrompt(dailyPrompt.text)}>
              Use This Prompt
            </Button>
          </CardFooter>
        </Card>
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

      {error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-destructive">{error}</div>
          </CardContent>
        </Card>
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