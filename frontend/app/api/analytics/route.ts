import { NextResponse } from "next/server";
import getServerSession from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { apiRequest, handleApiError } from "@/lib/api-utils";
import { serverApiClient } from "@/lib/api-client";

// Mock analytics data for fallback
const mockAnalytics = {
  entry_count: 15,
  entry_frequency: [
    { date: "2023-03-24", count: 1 },
    { date: "2023-03-25", count: 2 },
    { date: "2023-03-26", count: 0 },
    { date: "2023-03-27", count: 1 },
    { date: "2023-03-28", count: 3 },
    { date: "2023-03-29", count: 2 },
    { date: "2023-03-30", count: 1 },
  ],
  category_distribution: [
    { category: "Personal", count: 6, percentage: 40 },
    { category: "Work", count: 4, percentage: 26.7 },
    { category: "Ideas", count: 3, percentage: 20 },
    { category: "Health", count: 2, percentage: 13.3 },
  ],
  mood_trends: [
    { date: "2023-03-24", average_sentiment: 0.7, entry_count: 1 },
    { date: "2023-03-25", average_sentiment: 0.5, entry_count: 2 },
    { date: "2023-03-26", average_sentiment: 0, entry_count: 0 },
    { date: "2023-03-27", average_sentiment: 0.2, entry_count: 1 },
    { date: "2023-03-28", average_sentiment: 0.8, entry_count: 3 },
    { date: "2023-03-29", average_sentiment: 0.6, entry_count: 2 },
    { date: "2023-03-30", average_sentiment: 0.4, entry_count: 1 },
  ],
  writing_patterns: [
    { hour_of_day: 7, count: 1 },
    { hour_of_day: 9, count: 2 },
    { hour_of_day: 12, count: 1 },
    { hour_of_day: 16, count: 3 },
    { hour_of_day: 19, count: 2 },
    { hour_of_day: 22, count: 6 },
  ],
  word_count_average: 245,
  top_keywords: [
    "work",
    "meeting",
    "ideas",
    "health",
    "running",
    "family",
    "books",
    "project",
    "sleep",
    "goals",
  ],
  longest_streak_days: 6,
  current_streak_days: 4,
};

// GET: Fetch analytics data
export async function GET(req: Request) {
  try {
    // Get auth session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters from the URL
    const { searchParams } = new URL(req.url);
    const time_period = searchParams.get("time_period") || "month";

    // Try to get data from real backend
    try {
      // Use the token from the session to authenticate with the backend
      const token = session.accessToken as string;
      if (!token) {
        throw new Error("No access token available");
      }

      // Call the backend API
      const data = await serverApiClient(
        `/analytics?time_period=${time_period}`,
        token,
      );

      return NextResponse.json(data);
    } catch (backendError) {
      // Log the error but don't fail - use mock data instead
      console.warn(
        "Failed to fetch from backend, using mock data:",
        backendError,
      );

      // Return mock data as fallback
      return NextResponse.json(mockAnalytics);
    }
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: Request a new analytics computation
export async function POST() {
  try {
    // Get authentication session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Forward request to backend API
    const response = await apiRequest("/analytics", "POST");
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, "Failed to request analytics");
  }
}
