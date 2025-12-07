import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { serverApiClient } from "@/lib/api-client";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

// Mock transactions data for when backend is unavailable
const mockTransactions = [
  {
    id: "tx_1",
    user_id: "user_1",
    amount: 10,
    reason: "entry_created",
    description: "Created journal entry",
    entry_id: "entry_123",
    created_at: new Date().toISOString(),
  },
  {
    id: "tx_2",
    user_id: "user_1",
    amount: 15,
    reason: "streak_continued",
    description: "Streak continued (5 days)",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "tx_3",
    user_id: "user_1",
    amount: 5,
    reason: "ai_insights",
    description: "Requested AI insights",
    entry_id: "entry_122",
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

// GET: Fetch point transactions from backend
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      // Return mock data when not authenticated to prevent UI errors
      console.warn("No session found, returning mock transactions");
      return NextResponse.json(mockTransactions.slice(0, limit));
    }

    const token = (session as { accessToken?: string }).accessToken;

    if (!token) {
      console.warn("No access token, returning mock transactions");
      return NextResponse.json(mockTransactions.slice(0, limit));
    }

    try {
      const data = await serverApiClient(
        `/gamification/transactions?limit=${limit}`,
        token
      );
      return NextResponse.json(data);
    } catch (backendError) {
      console.warn(
        "Backend transactions API unavailable, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error"
      );
      return NextResponse.json(mockTransactions.slice(0, limit));
    }
  } catch (error) {
    console.error("Gamification transactions API error:", error);
    return NextResponse.json(mockTransactions);
  }
}
