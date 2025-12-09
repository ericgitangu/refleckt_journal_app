"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Pencil,
  Sparkles,
  Flame,
  Zap,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

interface CharacterCountInputProps
  extends Omit<React.ComponentProps<"textarea">, "onChange" | "value"> {
  value?: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  showMilestones?: boolean;
  label?: string;
}

interface Milestone {
  threshold: number;
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
}

const MILESTONES: Milestone[] = [
  {
    threshold: 100,
    icon: Pencil,
    label: "Getting started!",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    threshold: 250,
    icon: Sparkles,
    label: "Nice flow!",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    threshold: 500,
    icon: Flame,
    label: "On fire!",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    threshold: 750,
    icon: Zap,
    label: "Power writer!",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    threshold: 1000,
    icon: Trophy,
    label: "Limit reached!",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
];

// Sanitize input - remove potentially harmful content
function sanitizeInput(input: string): string {
  return input
    // Remove null bytes
    .replace(/\0/g, "")
    // Normalize whitespace (but keep newlines for textarea)
    .replace(/[\t\v\f]/g, " ")
    // Remove control characters except newlines and carriage returns
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Trim excessive consecutive spaces
    .replace(/ {3,}/g, "  ");
}

function CharacterCountInput({
  value = "",
  onChange,
  maxLength = 1000,
  showMilestones = true,
  label,
  className,
  placeholder = "Start typing...",
  ...props
}: CharacterCountInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [showMilestoneToast, setShowMilestoneToast] = useState<Milestone | null>(null);
  const [prevMilestoneIndex, setPrevMilestoneIndex] = useState(-1);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const charCount = localValue.length;
  const percentage = Math.min((charCount / maxLength) * 100, 100);
  const remaining = maxLength - charCount;
  const isNearLimit = remaining <= 50;
  const isAtLimit = remaining <= 0;

  // Get current milestone
  const currentMilestone = useMemo(() => {
    for (let i = MILESTONES.length - 1; i >= 0; i--) {
      if (charCount >= MILESTONES[i].threshold) {
        return { milestone: MILESTONES[i], index: i };
      }
    }
    return null;
  }, [charCount]);

  // Show milestone toast when reaching new milestone
  useEffect(() => {
    if (currentMilestone && currentMilestone.index > prevMilestoneIndex && showMilestones) {
      setShowMilestoneToast(currentMilestone.milestone);
      setPrevMilestoneIndex(currentMilestone.index);

      const timer = setTimeout(() => {
        setShowMilestoneToast(null);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [currentMilestone, prevMilestoneIndex, showMilestones]);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let newValue = e.target.value;

      // Sanitize input
      newValue = sanitizeInput(newValue);

      // Enforce max length
      if (newValue.length > maxLength) {
        newValue = newValue.slice(0, maxLength);
      }

      setLocalValue(newValue);
      onChange?.(newValue);
    },
    [maxLength, onChange]
  );

  // Get progress bar color based on percentage
  const getProgressColor = () => {
    if (isAtLimit) return "bg-red-500";
    if (isNearLimit) return "bg-amber-500";
    if (percentage >= 75) return "bg-yellow-500";
    if (percentage >= 50) return "bg-emerald-500";
    if (percentage >= 25) return "bg-blue-500";
    return "bg-primary";
  };

  // Get count text color
  const getCountColor = () => {
    if (isAtLimit) return "text-red-500 font-bold";
    if (isNearLimit) return "text-amber-500 font-semibold";
    return "text-muted-foreground";
  };

  // Get current status icon
  const StatusIcon = currentMilestone?.milestone.icon || Pencil;

  return (
    <div className="relative space-y-2">
      {/* Label */}
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}

      {/* Textarea Container */}
      <div className="relative">
        <textarea
          value={localValue}
          onChange={handleChange}
          maxLength={maxLength}
          placeholder={placeholder}
          className={cn(
            "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50",
            "flex min-h-[120px] w-full rounded-lg border bg-transparent px-3 py-2 text-base shadow-xs",
            "transition-all duration-200 outline-none focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "resize-none pb-12", // Extra padding for counter
            isAtLimit && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
            isNearLimit && !isAtLimit && "border-amber-500 focus-visible:border-amber-500 focus-visible:ring-amber-500/20",
            className
          )}
          {...props}
        />

        {/* Bottom bar with progress and count */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-background/80 to-transparent rounded-b-lg">
          {/* Progress bar */}
          <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden mb-2">
            <div
              className={cn(
                "absolute h-full rounded-full transition-all duration-300 ease-out",
                getProgressColor()
              )}
              style={{ width: `${percentage}%` }}
            />
            {/* Milestone markers */}
            {showMilestones &&
              MILESTONES.slice(0, -1).map((milestone) => (
                <div
                  key={milestone.threshold}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-full transition-colors",
                    charCount >= milestone.threshold
                      ? "bg-white/80"
                      : "bg-muted-foreground/30"
                  )}
                  style={{ left: `${(milestone.threshold / maxLength) * 100}%` }}
                />
              ))}
          </div>

          {/* Counter row */}
          <div className="flex items-center justify-between text-xs">
            {/* Left side - Status icon and milestone */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "p-1 rounded-full transition-all duration-300",
                  currentMilestone?.milestone.bgColor || "bg-muted",
                  isAtLimit && "bg-red-500/10 animate-pulse"
                )}
              >
                {isAtLimit ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <StatusIcon
                    className={cn(
                      "h-3.5 w-3.5 transition-all duration-300",
                      currentMilestone?.milestone.color || "text-muted-foreground"
                    )}
                  />
                )}
              </div>
              {currentMilestone && !isAtLimit && (
                <span
                  className={cn(
                    "text-xs font-medium transition-all duration-300",
                    currentMilestone.milestone.color
                  )}
                >
                  {currentMilestone.milestone.label}
                </span>
              )}
              {isAtLimit && (
                <span className="text-xs font-medium text-red-500">
                  Character limit reached
                </span>
              )}
            </div>

            {/* Right side - Character count */}
            <div className={cn("flex items-center gap-1.5 tabular-nums", getCountColor())}>
              {isNearLimit && !isAtLimit && (
                <span className="text-amber-500 animate-pulse">
                  {remaining} left
                </span>
              )}
              <span className={cn(
                "transition-all duration-200",
                isAtLimit && "scale-110"
              )}>
                {charCount.toLocaleString()}
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">
                {maxLength.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Milestone toast notification */}
      {showMilestoneToast && (
        <div
          className={cn(
            "absolute -top-12 left-1/2 -translate-x-1/2 z-10",
            "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg",
            "animate-in fade-in slide-in-from-bottom-4 duration-300",
            showMilestoneToast.bgColor,
            "border border-border/50 backdrop-blur-sm"
          )}
        >
          <showMilestoneToast.icon
            className={cn("h-4 w-4", showMilestoneToast.color)}
          />
          <span className={cn("text-sm font-medium", showMilestoneToast.color)}>
            {showMilestoneToast.label}
          </span>
          <CheckCircle2 className={cn("h-4 w-4", showMilestoneToast.color)} />
        </div>
      )}
    </div>
  );
}

export { CharacterCountInput };
