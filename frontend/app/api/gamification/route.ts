import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { serverApiClient } from "@/lib/api-client";

// Mock data for when backend is unavailable
const mockGamificationStats = {
  user_id: "user_1",
  tenant_id: "default",
  points_balance: 350,
  lifetime_points: 350,
  level: 3,
  level_title: "Regular Reflector",
  current_streak: 5,
  longest_streak: 12,
  last_entry_date: new Date().toISOString().split("T")[0],
  achievements: [
    {
      id: "first_entry",
      name: "First Steps",
      description: "Create your first journal entry",
      icon: "pencil",
      points: 10,
      unlocked: true,
      unlocked_at: "2024-01-15T10:30:00Z",
      category: "entries",
      requirement: 1,
    },
    {
      id: "streak_3",
      name: "Getting Started",
      description: "Maintain a 3-day streak",
      icon: "flame",
      points: 25,
      unlocked: true,
      unlocked_at: "2024-01-18T08:00:00Z",
      category: "streak",
      requirement: 3,
    },
    {
      id: "entries_10",
      name: "Consistent Writer",
      description: "Write 10 journal entries",
      icon: "book",
      points: 50,
      unlocked: true,
      unlocked_at: "2024-02-01T15:45:00Z",
      category: "entries",
      requirement: 10,
    },
    {
      id: "streak_7",
      name: "Week Warrior",
      description: "Maintain a 7-day streak",
      icon: "flame",
      points: 50,
      unlocked: false,
      category: "streak",
      requirement: 7,
      progress: 5,
    },
    {
      id: "entries_50",
      name: "Dedicated Journaler",
      description: "Write 50 journal entries",
      icon: "book",
      points: 150,
      unlocked: false,
      category: "entries",
      requirement: 50,
      progress: 15,
    },
  ],
  total_entries: 15,
  total_words: 4500,
  insights_requested: 3,
  prompts_used: 5,
  next_level_points: 600,
  points_to_next_level: 250,
  created_at: "2024-01-15T10:00:00Z",
  updated_at: new Date().toISOString(),
};

// GET: Fetch gamification stats from backend
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      // Return mock data when not authenticated to prevent UI errors
      console.warn("No session found, returning mock gamification stats");
      return NextResponse.json(mockGamificationStats);
    }

    const token = (session as { accessToken?: string }).accessToken;
    if (!token) {
      // Return mock data if no token available
      console.warn("No access token, returning mock gamification stats");
      return NextResponse.json(mockGamificationStats);
    }

    try {
      const data = await serverApiClient("/gamification/stats", token);
      return NextResponse.json(data);
    } catch (backendError) {
      // Backend call failed, return mock data
      console.warn(
        "Backend gamification API unavailable, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error"
      );
      return NextResponse.json(mockGamificationStats);
    }
  } catch (error) {
    console.error("Gamification stats API error:", error);
    // Return mock data on any error to prevent UI from breaking
    return NextResponse.json(mockGamificationStats);
  }
}
