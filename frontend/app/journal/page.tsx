"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { trpc } from "@/app/hooks/useTRPC";
import { JournalEntryFeed } from "@/components/journal/journal-entry-feed";
import { TrpcExample } from "@/components/TrpcExample";
import { ClientOnly } from "@/components/ClientOnly";
import { formatMoodWithEmoji } from "@/lib/mood-utils";

// Define the journal entry type
interface JournalEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string | Date;
  mood?: string;
  tags?: string[];
}

// Journal content component with React hooks
function JournalContent() {
  const { data: session, status } = useSession();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // First try tRPC, fallback to REST API if needed
  const {
    data: journalData,
    isLoading: isLoadingJournal,
    error: trpcError,
  } = trpc.getJournalEntries.useQuery(undefined, {
    // Don't retry on error, we'll fallback to our REST API
    retry: false,
    onError: (err) => {
      console.error("tRPC error, falling back to REST API:", err);
      // We'll handle the fallback in the useEffect
    },
  });

  // Fallback to REST API if tRPC fails
  useEffect(() => {
    // If tRPC succeeded, use that data
    if (journalData) {
      setEntries(journalData.items);
      setLoading(false);
      return;
    }

    // If tRPC is still loading and hasn't errored, wait
    if (isLoadingJournal && !trpcError) {
      return;
    }

    // If we get here, tRPC has either errored or finished loading without data
    // Fetch from our fallback REST API
    const fetchEntries = async () => {
      try {
        const response = await fetch("/api/journal-entries");
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        setEntries(data.items);
        setError(null);
      } catch (err) {
        console.error("Error fetching from REST API:", err);
        setError("Failed to load journal entries");
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [journalData, isLoadingJournal, trpcError]);

  // If we're still loading from both tRPC and our fallback
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

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Journal</h1>
        <Button asChild>
          <Link href="/journal/new">
            <Icons.plus className="mr-2 h-4 w-4" />
            New Entry
          </Link>
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-destructive">{error}</div>
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              No journal entries yet. Start writing!
            </p>
            <Button asChild>
              <Link href="/journal/new">
                <Icons.plus className="mr-2 h-4 w-4" />
                Create Your First Entry
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <CardTitle>{entry.title}</CardTitle>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </div>
                  {entry.mood && (
                    <div className="text-sm px-2 py-0.5 rounded-full bg-muted">
                      {formatMoodWithEmoji(entry.mood)}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{entry.content}</p>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entry.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-secondary rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Page component with ClientOnly wrapper
export default function JournalPage() {
  return (
    <ClientOnly>
      <JournalContent />
    </ClientOnly>
  );
}
