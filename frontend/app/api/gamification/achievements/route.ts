import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { ACHIEVEMENTS_CONFIG } from "@/types/gamification";
import { calculateAchievements } from "@/lib/gamification-calculator";
import type { Entry } from "@/types/entries";
import axios from "axios";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "";

// Generate default achievements from definitions (all locked with 0 progress)
function getDefaultAchievements() {
  return ACHIEVEMENTS_CONFIG.map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    points: def.points,
    unlocked: false,
    unlocked_at: null,
    category: def.category,
    requirement: def.requirement,
    progress: 0,
  }));
}

// GET: Fetch achievements - calculate from actual entries
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

    // First try backend achievements
    try {
      const response = await axios.get(`${API_URL}/gamification/achievements`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });
      const data = response.data;
      // If backend has achievements with any unlocked, use them
      if (data && Array.isArray(data) && data.some((a: { unlocked?: boolean }) => a.unlocked)) {
        return NextResponse.json(data);
      }
    } catch (backendError) {
      console.warn(
        "Backend achievements API unavailable, calculating from entries:",
        backendError instanceof Error ? backendError.message : "Unknown error"
      );
    }

    // Backend unavailable or empty - calculate achievements from actual entries
    try {
      const response = await axios.get(`${API_URL}/entries`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      // Handle various response formats
      let entries: Entry[] = [];
      if (Array.isArray(response.data)) {
        entries = response.data;
      } else if (response.data?.items && Array.isArray(response.data.items)) {
        entries = response.data.items;
      } else if (response.data?.entries && Array.isArray(response.data.entries)) {
        entries = response.data.entries;
      }

      const calculatedAchievements = calculateAchievements(entries);
      return NextResponse.json(calculatedAchievements);
    } catch (entriesError) {
      console.warn(
        "Could not fetch entries for achievement calculation:",
        entriesError instanceof Error ? entriesError.message : "Unknown error"
      );
      return NextResponse.json(getDefaultAchievements());
    }
  } catch (error) {
    console.error("Gamification achievements API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}
