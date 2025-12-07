import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { serverApiClient } from "@/lib/api-client";

// Mock achievements data for when backend is unavailable
const mockAchievements = [
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
];

// GET: Fetch achievements from backend
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      // Return mock data when not authenticated to prevent UI errors
      console.warn("No session found, returning mock achievements");
      return NextResponse.json(mockAchievements);
    }

    const token = (session as { accessToken?: string }).accessToken;

    if (!token) {
      console.warn("No access token, returning mock achievements");
      return NextResponse.json(mockAchievements);
    }

    try {
      const data = await serverApiClient("/gamification/achievements", token);
      return NextResponse.json(data);
    } catch (backendError) {
      console.warn(
        "Backend achievements API unavailable, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error"
      );
      return NextResponse.json(mockAchievements);
    }
  } catch (error) {
    console.error("Gamification achievements API error:", error);
    return NextResponse.json(mockAchievements);
  }
}
