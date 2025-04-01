"use client";

import { useState, Suspense, lazy, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Save, X, MessageSquareText, Smile } from "lucide-react";
import { RandomPrompt } from "@/components/RandomPrompt";
import { Prompt } from "@/lib/api";
import { MOOD_EMOJIS } from "@/lib/mood-utils";

// Lazy load client components
const ThemeToggleClient = lazy(
  () => import("@/components/theme/theme-toggle-client"),
);

// Loading fallback
const LoadingFallback = () => (
  <div className="animate-pulse h-8 w-8 rounded-md bg-muted"></div>
);

// Common mood options for journaling
const MOOD_OPTIONS = Object.keys(MOOD_EMOJIS);

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export default function NewJournalEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [mood, setMood] = useState<string>("");
  const [showPrompts, setShowPrompts] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);

  // Check for prompt in URL parameters
  useEffect(() => {
    const promptParam = searchParams?.get("prompt");
    if (promptParam) {
      setContent(promptParam + "\n\n");
    }
  }, [searchParams]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    try {
      // Save the entry via the API
      const response = await fetch("/api/journal-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          tags,
          mood,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`);
      }

      // Success - redirect back to journal page
      router.push("/journal");
    } catch (error) {
      console.error("Error saving journal entry:", error);
      // In a real app, you would show an error message to the user
      alert("Failed to save your journal entry. Please try again.");
    }
  };

  const handleUsePrompt = (prompt: Prompt) => {
    // Insert the prompt at the beginning of the content
    setContent(prompt.text + "\n\n" + content);
    // Add the category as a tag if it doesn't exist
    if (!tags.includes(prompt.category.toLowerCase())) {
      setTags([...tags, prompt.category.toLowerCase()]);
    }
    // Hide the prompts panel
    setShowPrompts(false);
  };

  const selectMood = (selectedMood: string) => {
    setMood(selectedMood);
    setShowMoodSelector(false);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Link
              href="/journal"
              className="flex items-center text-muted-foreground hover:text-foreground transition"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Journal</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrompts(!showPrompts)}
              className="flex items-center gap-1 px-3 py-2 text-muted-foreground hover:text-foreground transition text-sm"
            >
              <MessageSquareText className="h-4 w-4" />
              <span>{showPrompts ? "Hide Prompts" : "Show Prompts"}</span>
            </button>
            <Suspense fallback={<LoadingFallback />}>
              <ThemeToggleClient />
            </Suspense>
          </div>
        </div>

        {showPrompts && (
          <div className="mb-6 p-4 border rounded-lg bg-background/50">
            <h2 className="text-lg font-medium mb-4">Writing Prompts</h2>
            <div className="grid grid-cols-1 gap-4">
              <RandomPrompt
                onUsePrompt={handleUsePrompt}
                initialFetch={true}
                compact={true}
                label="Get a Prompt"
              />
              <div className="flex justify-end">
                <Link
                  href="/journal/prompts"
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Browse more prompts →
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="journal-paper p-6 rounded-lg">
          <h1 className="font-serif text-2xl font-bold mb-6">
            New Journal Entry
          </h1>

          <div className="space-y-6">
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Entry Title"
                className="w-full bg-transparent border-b-2 border-[rgba(0,0,0,0.1)] p-2 text-xl font-serif font-medium focus:outline-none ink-animation"
              />
            </div>

            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind today?"
                className="w-full bg-transparent border-0 p-0 min-h-[300px] text-lg font-serif leading-relaxed focus:outline-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(transparent, transparent 31px, rgba(0, 0, 0, 0.1) 32px)",
                  lineHeight: "32px",
                  padding: "8px 0",
                }}
              />
            </div>

            <div className="border-t border-[rgba(0,0,0,0.1)] pt-4">
              {/* Mood Selector */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Smile className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    How are you feeling?
                  </span>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowMoodSelector(!showMoodSelector)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${
                      mood ? "border-primary" : "border-[rgba(0,0,0,0.1)]"
                    }`}
                  >
                    {mood ? (
                      <>
                        {MOOD_EMOJIS[mood]} {mood}
                      </>
                    ) : (
                      "Select mood"
                    )}
                  </button>

                  {showMoodSelector && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-background rounded-lg border shadow-lg z-10 w-56">
                      <div className="grid grid-cols-3 gap-1">
                        {MOOD_OPTIONS.map((moodOption) => (
                          <button
                            key={moodOption}
                            onClick={() => selectMood(moodOption)}
                            className={`px-2 py-1 rounded text-xs capitalize transition hover:bg-muted ${
                              mood === moodOption
                                ? "bg-primary/10 text-primary"
                                : ""
                            }`}
                          >
                            {MOOD_EMOJIS[moodOption]} {moodOption}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className="journal-tag flex items-center gap-1"
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-[hsl(var(--destructive))] transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add tags (press Enter)"
                  className="flex-1 bg-transparent border-b border-[rgba(0,0,0,0.1)] p-1 text-sm focus:outline-none ink-animation"
                />
                <button
                  onClick={handleAddTag}
                  className="text-sm text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]/80 transition"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={!title.trim() || !content.trim()}
                className="flex items-center gap-1 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-md hover:bg-[hsl(var(--primary))]/90 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                <span>Save Entry</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
