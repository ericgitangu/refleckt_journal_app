"use client";

import React, { useState } from "react";
import { trpc } from "@/app/hooks/useTRPC";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JournalEntry } from "@/app/server/api/routers";

export function TrpcExample() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 1. Using tRPC to fetch data with a query
  // This automatically handles caching, refetching, and loading states
  const journalEntries = trpc.getJournalEntries.useQuery();

  // 2. Using tRPC for mutations (data changes)
  // This returns a mutate function and various states like isLoading
  const addEntry = trpc.addJournalEntry.useMutation({
    // 3. Updating the cache after mutation for instant UI updates
    onSuccess: () => {
      // Clear the form
      setTitle("");
      setContent("");

      // Invalidate the query to refetch data
      journalEntries.refetch();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 4. Call the mutation with input data
    addEntry.mutate({
      title,
      content,
    });
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Add Journal Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <textarea
                id="content"
                className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={addEntry.isLoading}
              className="w-full"
            >
              {addEntry.isLoading ? "Saving..." : "Save Entry"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {journalEntries.isLoading ? (
            <p>Loading entries...</p>
          ) : journalEntries.error ? (
            <p className="text-destructive">
              Error: {journalEntries.error.message}
            </p>
          ) : !journalEntries.data || journalEntries.data.items.length === 0 ? (
            <p>No entries yet. Create your first one!</p>
          ) : (
            <div className="space-y-4">
              {journalEntries.data.items.map((entry: JournalEntry) => (
                <div key={entry.id} className="p-4 border rounded-lg">
                  <h3 className="font-medium">{entry.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {entry.content}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
