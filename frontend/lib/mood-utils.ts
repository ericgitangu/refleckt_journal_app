// Mapping of mood values to emoji representations
export const MOOD_EMOJIS: Record<string, string> = {
  happy: "😊",
  content: "🙂",
  grateful: "🙏",
  excited: "😃",
  hopeful: "🌱",
  anxious: "😰",
  stressed: "😫",
  sad: "😢",
  frustrated: "😤",
  reflective: "🤔",
  peaceful: "😌",
  tired: "😴",
  energized: "⚡",
  inspired: "✨",
  proud: "🦋",
  neutral: "😐",
  relieved: "😅",
};

/**
 * Get emoji for a given mood
 * @param mood The mood string
 * @returns The emoji character for the mood, or a default emoji if not found
 */
export function getMoodEmoji(mood: string | undefined): string {
  if (!mood) return "";
  return MOOD_EMOJIS[mood.toLowerCase()] || "";
}

/**
 * Format a mood with its emoji
 * @param mood The mood string
 * @returns Formatted string with emoji and mood text
 */
export function formatMoodWithEmoji(mood: string | undefined): string {
  if (!mood) return "";
  const emoji = getMoodEmoji(mood);
  return emoji ? `${emoji} ${mood}` : mood;
}
