import type { Entry } from "@/types/entries";
import type { GamificationStats, Achievement } from "@/types/gamification";
import {
  POINTS_CONFIG,
  ACHIEVEMENTS_CONFIG,
  getLevelFromPoints,
  getPointsToNextLevel,
} from "@/types/gamification";

/**
 * Calculate streak from entry dates
 * Returns current streak and longest streak
 */
function calculateStreak(entries: Entry[]): { current: number; longest: number; lastEntryDate: string | null } {
  if (entries.length === 0) {
    return { current: 0, longest: 0, lastEntryDate: null };
  }

  // Sort entries by date (most recent first)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Get unique dates (one entry per day counts)
  const uniqueDates = new Set<string>();
  sortedEntries.forEach((entry) => {
    const date = new Date(entry.created_at).toISOString().split("T")[0];
    uniqueDates.add(date);
  });

  const sortedDates = Array.from(uniqueDates).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (sortedDates.length === 0) {
    return { current: 0, longest: 0, lastEntryDate: null };
  }

  const lastEntryDate = sortedDates[0];
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Check if streak is active (last entry was today or yesterday)
  const streakActive = lastEntryDate === today || lastEntryDate === yesterday;

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  // Calculate streaks
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const currentDate = new Date(sortedDates[i]);
      const previousDate = new Date(sortedDates[i - 1]);
      const diffDays = Math.round(
        (previousDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (diffDays === 1) {
        // Consecutive days
        tempStreak++;
      } else {
        // Streak broken
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 1;
      }
    }
  }

  // Check final streak
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }

  // Current streak is only valid if last entry was recent
  if (streakActive) {
    // Recalculate current streak from today/yesterday
    currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i]);
      const previousDate = new Date(sortedDates[i - 1]);
      const diffDays = Math.round(
        (previousDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { current: currentStreak, longest: Math.max(longestStreak, currentStreak), lastEntryDate };
}

/**
 * Calculate points from entries
 */
function calculatePoints(entries: Entry[]): number {
  let points = 0;

  // Points per entry
  points += entries.length * POINTS_CONFIG.entry_created;

  // Word bonuses per entry
  entries.forEach((entry) => {
    const words = entry.word_count || 0;
    if (words >= 500) {
      points += POINTS_CONFIG.word_bonus_500;
    } else if (words >= 300) {
      points += POINTS_CONFIG.word_bonus_300;
    } else if (words >= 100) {
      points += POINTS_CONFIG.word_bonus_100;
    }
  });

  // Streak bonuses
  const streakInfo = calculateStreak(entries);
  if (streakInfo.current >= 1) {
    // Streak continuation bonus for each day in streak
    points += Math.min(streakInfo.current, 30) * POINTS_CONFIG.streak_continued;
  }
  if (streakInfo.longest >= 7) {
    points += POINTS_CONFIG.streak_7_days;
  }
  if (streakInfo.longest >= 30) {
    points += POINTS_CONFIG.streak_30_days;
  }

  return points;
}

/**
 * Check achievement unlocks based on stats
 */
function checkAchievements(
  totalEntries: number,
  streak: { current: number; longest: number },
  totalWords: number,
  maxWordsInEntry: number,
  level: number,
  positiveMoodCount: number = 0
): Achievement[] {
  return ACHIEVEMENTS_CONFIG.map((def) => {
    let unlocked = false;
    let progress = 0;

    switch (def.category) {
      case "entries":
        progress = totalEntries;
        unlocked = totalEntries >= def.requirement;
        break;
      case "streak":
        progress = streak.longest;
        unlocked = streak.longest >= def.requirement;
        break;
      case "words":
        // For word achievements, check max words in single entry
        progress = maxWordsInEntry;
        unlocked = maxWordsInEntry >= def.requirement;
        break;
      case "level":
        progress = level;
        unlocked = level >= def.requirement;
        break;
      case "mood":
        progress = positiveMoodCount;
        unlocked = positiveMoodCount >= def.requirement;
        break;
      case "insights":
        // These require backend tracking - default to 0
        progress = 0;
        unlocked = false;
        break;
      case "prompts":
        // These require backend tracking - default to 0
        progress = 0;
        unlocked = false;
        break;
      default:
        break;
    }

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      points: def.points,
      unlocked,
      unlocked_at: unlocked ? new Date().toISOString() : undefined,
      category: def.category,
      requirement: def.requirement,
      progress,
    };
  });
}

/**
 * Calculate complete gamification stats from entries
 */
export function calculateGamificationStats(
  entries: Entry[],
  userId: string,
  tenantId: string = "default"
): GamificationStats {
  const totalEntries = entries.length;
  const totalWords = entries.reduce((sum, e) => sum + (e.word_count || 0), 0);
  const maxWordsInEntry = entries.reduce(
    (max, e) => Math.max(max, e.word_count || 0),
    0
  );

  // Count positive mood entries
  const positiveMoods = ["happy", "excited", "grateful", "peaceful", "content", "joyful"];
  const positiveMoodCount = entries.filter(
    (e) => e.mood && positiveMoods.includes(e.mood.toLowerCase())
  ).length;

  // Calculate points
  const points = calculatePoints(entries);

  // Calculate streak
  const streakInfo = calculateStreak(entries);

  // Get level info
  const levelInfo = getLevelFromPoints(points);
  const pointsToNext = getPointsToNextLevel(points);

  // Check achievements
  const achievements = checkAchievements(
    totalEntries,
    streakInfo,
    totalWords,
    maxWordsInEntry,
    levelInfo.level,
    positiveMoodCount
  );

  // Calculate unlocked achievement points
  const achievementPoints = achievements
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.points, 0);

  const finalPoints = points + achievementPoints;
  const finalLevelInfo = getLevelFromPoints(finalPoints);

  return {
    user_id: userId,
    tenant_id: tenantId,
    points_balance: finalPoints,
    lifetime_points: finalPoints,
    level: finalLevelInfo.level,
    level_title: finalLevelInfo.title,
    current_streak: streakInfo.current,
    longest_streak: streakInfo.longest,
    last_entry_date: streakInfo.lastEntryDate,
    achievements,
    total_entries: totalEntries,
    total_words: totalWords,
    insights_requested: 0, // Would need backend tracking
    prompts_used: 0, // Would need backend tracking
    next_level_points: finalLevelInfo.max_points === Infinity
      ? finalLevelInfo.min_points
      : finalLevelInfo.max_points + 1,
    points_to_next_level: getPointsToNextLevel(finalPoints),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Calculate achievements with progress from entries
 */
export function calculateAchievements(entries: Entry[]): Achievement[] {
  const totalEntries = entries.length;
  const totalWords = entries.reduce((sum, e) => sum + (e.word_count || 0), 0);
  const maxWordsInEntry = entries.reduce(
    (max, e) => Math.max(max, e.word_count || 0),
    0
  );

  const positiveMoods = ["happy", "excited", "grateful", "peaceful", "content", "joyful"];
  const positiveMoodCount = entries.filter(
    (e) => e.mood && positiveMoods.includes(e.mood.toLowerCase())
  ).length;

  const points = calculatePoints(entries);
  const levelInfo = getLevelFromPoints(points);
  const streakInfo = calculateStreak(entries);

  return checkAchievements(
    totalEntries,
    streakInfo,
    totalWords,
    maxWordsInEntry,
    levelInfo.level,
    positiveMoodCount
  );
}
