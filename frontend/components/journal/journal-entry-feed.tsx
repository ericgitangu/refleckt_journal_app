// File: components/journal/journal-entry-feed.tsx
"use client";

import { useEffect, useState } from "react";
import { JournalEntryCard } from "./journal-entry-card";
import { useJournalEntries, JournalEntry } from "@/hooks/use-journal-entries";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingFeed } from "@/components/journal/loading-feed";

export function JournalEntryFeed() {
  const { entries, isLoading, error, deleteEntry } = useJournalEntries();
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading journal entries",
        description: error as string,
      });
    }
  }, [error, toast]);

  const handleEdit = (id: string) => {
    router.push(`/journal/${id}`);
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;

    try {
      await deleteEntry(entryToDelete);
      toast({
        title: "Entry deleted",
        description: "Your journal entry has been deleted",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error deleting entry",
        description:
          err instanceof Error ? err.message : "An unknown error occurred",
      });
    } finally {
      setEntryToDelete(null);
    }
  };

  if (isLoading) {
    return <LoadingFeed />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </Alert>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium">No entries yet</h3>
        <p className="text-muted-foreground mt-2">
          Start journaling to see your entries here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {entries.map((entry: JournalEntry) => (
          <JournalEntryCard
            key={entry.id}
            entry={entry}
            onEdit={handleEdit}
            onDelete={(id) => setEntryToDelete(id)}
          />
        ))}
      </div>

      <AlertDialog
        open={!!entryToDelete}
        onOpenChange={(open: boolean) => !open && setEntryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              journal entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
