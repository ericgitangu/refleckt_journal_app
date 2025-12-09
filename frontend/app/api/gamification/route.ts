import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { calculateGamificationStats } from "@/lib/gamification-calculator";
import type { Entry } from "@/types/entries";
import axios from "axios";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "";

// GET: Fetch gamification stats - calculate from actual entries
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

    const userId = session.user.id || session.user.email || "";

    // First try to get stats from backend gamification service
    try {
      const response = await axios.get(`${API_URL}/gamification/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });
      const data = response.data;
      // If backend has valid data with points, use it
      if (data && data.points_balance > 0) {
        return NextResponse.json(data);
      }
    } catch (backendError) {
      console.warn(
        "Backend gamification API unavailable, calculating from entries:",
        backendError instanceof Error ? backendError.message : "Unknown error"
      );
    }

    // Backend unavailable or empty - calculate stats from actual entries
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

      console.log(`Gamification: Found ${entries.length} entries for calculation`);

      const calculatedStats = calculateGamificationStats(
        entries,
        userId,
        "default"
      );
      return NextResponse.json(calculatedStats);
    } catch (entriesError) {
      console.warn(
        "Could not fetch entries for calculation:",
        entriesError instanceof Error ? entriesError.message : "Unknown error"
      );

      // Return default starting stats if we can't fetch entries
      return NextResponse.json(
        calculateGamificationStats([], userId, "default")
      );
    }
  } catch (error) {
    console.error("Gamification stats API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch gamification stats" },
      { status: 500 }
    );
  }
}
