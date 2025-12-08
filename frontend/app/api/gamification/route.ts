import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { serverApiClient } from "@/lib/api-client";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

// Default stats for new users (not mock - actual starting state)
const defaultGamificationStats = {
  user_id: "",
  tenant_id: "default",
  points_balance: 0,
  lifetime_points: 0,
  level: 1,
  level_title: "Novice Writer",
  current_streak: 0,
  longest_streak: 0,
  last_entry_date: null,
  achievements: [],
  total_entries: 0,
  total_words: 0,
  insights_requested: 0,
  prompts_used: 0,
  next_level_points: 100,
  points_to_next_level: 100,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// GET: Fetch gamification stats from backend
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = (session as { accessToken?: string }).accessToken;
    if (!token) {
      return NextResponse.json(
        { error: "Access token not available" },
        { status: 401 }
      );
    }

    try {
      const data = await serverApiClient("/gamification/stats", token);
      return NextResponse.json(data);
    } catch (backendError) {
      // Backend returned 404 likely means user has no stats yet
      // Return default starting stats (not mock data)
      console.warn(
        "Backend gamification API error:",
        backendError instanceof Error ? backendError.message : "Unknown error"
      );

      // Return default stats for new users
      return NextResponse.json({
        ...defaultGamificationStats,
        user_id: session.user.id || session.user.email || "",
      });
    }
  } catch (error) {
    console.error("Gamification stats API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch gamification stats" },
      { status: 500 }
    );
  }
}
