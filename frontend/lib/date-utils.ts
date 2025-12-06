import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisYear, parseISO } from "date-fns";

/**
 * Format a date in a human-friendly way
 * - "Just now" for < 1 minute
 * - "5 minutes ago" for < 1 hour
 * - "2 hours ago" for today
 * - "Yesterday at 3:30 PM"
 * - "Tuesday at 3:30 PM" for this week
 * - "Dec 5 at 3:30 PM" for this year
 * - "Dec 5, 2023" for older dates
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  // Just now (< 1 minute)
  if (diffMinutes < 1) {
    return "Just now";
  }

  // Minutes ago (< 1 hour)
  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  // Hours ago (today)
  if (isToday(d)) {
    if (diffHours < 6) {
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    }
    return `Today at ${format(d, "h:mm a")}`;
  }

  // Yesterday
  if (isYesterday(d)) {
    return `Yesterday at ${format(d, "h:mm a")}`;
  }

  // This week
  if (isThisWeek(d, { weekStartsOn: 1 })) {
    return format(d, "EEEE 'at' h:mm a");
  }

  // This year
  if (isThisYear(d)) {
    return format(d, "MMM d 'at' h:mm a");
  }

  // Older
  return format(d, "MMM d, yyyy");
}

/**
 * Format a date for display in a card header (shorter format)
 */
export function formatCardDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;

  if (isToday(d)) {
    return `Today, ${format(d, "h:mm a")}`;
  }

  if (isYesterday(d)) {
    return `Yesterday, ${format(d, "h:mm a")}`;
  }

  if (isThisWeek(d, { weekStartsOn: 1 })) {
    return format(d, "EEEE, h:mm a");
  }

  if (isThisYear(d)) {
    return format(d, "MMM d, h:mm a");
  }

  return format(d, "MMM d, yyyy");
}

/**
 * Format a simple date (no time)
 */
export function formatSimpleDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;

  if (isToday(d)) {
    return "Today";
  }

  if (isYesterday(d)) {
    return "Yesterday";
  }

  if (isThisYear(d)) {
    return format(d, "MMMM d");
  }

  return format(d, "MMMM d, yyyy");
}

/**
 * Format date for journal entry display (DD/MM/YYYY format as shown in screenshot)
 */
export function formatJournalDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy");
}

/**
 * Get time elapsed since date in a compact format
 */
export function getTimeElapsed(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format for analytics charts (abbreviated)
 */
export function formatChartDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d");
}

/**
 * Format time only
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "h:mm a");
}

/**
 * Format for ISO strings (API responses)
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Parse an ISO string safely
 */
export function safeParse(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  try {
    return parseISO(date);
  } catch {
    return null;
  }
}
