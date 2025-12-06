"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getTagColor, formatTag } from "@/lib/tag-colors";

interface TagBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tag: string;
  showHash?: boolean;
  size?: "sm" | "md" | "lg";
  removable?: boolean;
  onRemove?: () => void;
}

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
};

export function TagBadge({
  tag,
  showHash = true,
  size = "md",
  removable = false,
  onRemove,
  className,
  ...props
}: TagBadgeProps) {
  const colors = getTagColor(tag);
  const displayTag = showHash ? formatTag(tag) : tag.replace(/^#/, "");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
        colors.bg,
        colors.text,
        colors.border,
        "border",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {displayTag}
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 -mr-1"
          aria-label={`Remove ${tag}`}
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

// Mood badge with specific styling
interface MoodBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  mood: string;
  emoji?: string;
  size?: "sm" | "md" | "lg";
}

const MOOD_CONFIG: Record<string, { emoji: string; color: typeof moodColors.positive }> = {
  // Positive moods
  happy: { emoji: "😊", color: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-200 dark:border-yellow-800" } },
  excited: { emoji: "🎉", color: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800" } },
  grateful: { emoji: "🙏", color: { bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-700 dark:text-pink-300", border: "border-pink-200 dark:border-pink-800" } },
  hopeful: { emoji: "🌟", color: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" } },
  peaceful: { emoji: "☮️", color: { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-200 dark:border-cyan-800" } },
  content: { emoji: "😌", color: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" } },

  // Neutral moods
  reflective: { emoji: "🤔", color: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" } },
  thoughtful: { emoji: "💭", color: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800" } },
  curious: { emoji: "🧐", color: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" } },

  // Challenging moods
  anxious: { emoji: "😰", color: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" } },
  sad: { emoji: "😢", color: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" } },
  frustrated: { emoji: "😤", color: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" } },
  overwhelmed: { emoji: "😵", color: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" } },
  tired: { emoji: "😴", color: { bg: "bg-slate-100 dark:bg-slate-900/30", text: "text-slate-700 dark:text-slate-300", border: "border-slate-200 dark:border-slate-800" } },
};

const moodColors = {
  positive: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  neutral: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
  negative: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
};

export function MoodBadge({
  mood,
  emoji,
  size = "md",
  className,
  ...props
}: MoodBadgeProps) {
  const normalizedMood = mood.toLowerCase().trim();
  const moodConfig = MOOD_CONFIG[normalizedMood];

  const colors = moodConfig?.color || moodColors.neutral;
  const displayEmoji = emoji || moodConfig?.emoji || "💫";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
        colors.bg,
        colors.text,
        colors.border,
        "border",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span className="text-base leading-none">{displayEmoji}</span>
      <span className="capitalize">{mood}</span>
    </span>
  );
}

export { getTagColor, formatTag };
