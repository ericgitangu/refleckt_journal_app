"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useEntry, useUpdateEntry, useDeleteEntry } from "@/hooks/useEntries";
import { useEntryInsights } from "@/hooks/useInsights";
import EntryEditor from "@/components/journal/entry-editor";
import InsightsPanel from "@/components/journal/insights-panel";
import TagsInput from "@/components/journal/tags-input";
import MoodSelector from "@/components/journal/mood-selector";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext";

export default function EntryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { settings } = useSettings();

  // Fetch entry data
  const { data: entry, isLoading, error } = useEntry(id as string);

  // Fetch AI insights if enabled
  const { data: insights, isLoading: insightsLoading } = useEntryInsights(
    id as string,
    { enabled: settings?.ai_insights_enabled ?? false },
  );

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [mood, setMood] = useState<string | undefined>(undefined);

  // Set up mutations
  const updateEntryMutation = useUpdateEntry(id as string);
  const deleteEntryMutation = useDeleteEntry();

  // Update form state when entry data arrives
  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
      setTags(entry.tags);
      setMood(entry.mood);
    }
  }, [entry]);

  // Handle save
  const handleSave = async () => {
    try {
      await updateEntryMutation.mutateAsync({
        title,
        content,
        tags,
        mood,
      });
      toast({
        title: "Success",
        description: "Entry saved successfully",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save entry",
        variant: "destructive",
      });
      console.error(err);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this entry?")) {
      try {
        await deleteEntryMutation.mutateAsync(id as string);
        toast({
          title: "Success",
          description: "Entry deleted",
          variant: "default",
        });
        router.push("/journal");
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to delete entry",
          variant: "destructive",
        });
        console.error(err);
      }
    }
  };

  if (isLoading) {
    return <Skeleton className="h-screen" />;
  }

  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return <div>Error loading entry: {errorMessage}</div>;
  }

  return (
    <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
      <div className="md:col-span-2">
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold w-full bg-transparent border-none focus:outline-none"
            placeholder="Entry Title"
          />

          <div className="space-x-2">
            <Button
              onClick={handleSave}
              disabled={updateEntryMutation.isLoading}
            >
              {updateEntryMutation.isLoading ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteEntryMutation.isLoading}
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="mb-4 flex items-center space-x-4">
          <MoodSelector value={mood} onChange={setMood} />
          <span className="text-sm text-gray-500">
            {new Date(entry?.created_at || Date.now()).toLocaleDateString()}
          </span>
        </div>

        <EntryEditor
          value={content}
          onChange={setContent}
          fontSize={settings?.editor_font_size || 16}
          placeholder="Start writing your thoughts..."
        />

        <div className="mt-4">
          <TagsInput value={tags} onChange={setTags} />
        </div>
      </div>

      {settings?.ai_insights_enabled && (
        <div className="md:col-span-1">
          <InsightsPanel
            insights={insights}
            isLoading={insightsLoading}
            entryId={id as string}
          />
        </div>
      )}
    </div>
  );
}
