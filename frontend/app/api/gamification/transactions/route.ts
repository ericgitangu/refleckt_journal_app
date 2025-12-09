import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { POINTS_CONFIG } from "@/types/gamification";
import type { Entry } from "@/types/entries";
import type { PointsTransaction } from "@/types/gamification";
import axios from "axios";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "";

// Generate transaction history from entries
function generateTransactionsFromEntries(entries: Entry[], limit: number): PointsTransaction[] {
  const transactions: PointsTransaction[] = [];

  // Sort entries by date (most recent first)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  sortedEntries.forEach((entry, index) => {
    // Base points for entry creation
    transactions.push({
      id: `tx-${entry.id}-create`,
      user_id: entry.user_id,
      amount: POINTS_CONFIG.entry_created,
      reason: "entry_created",
      description: `Created journal entry: "${entry.title?.slice(0, 30) || 'Untitled'}${(entry.title?.length || 0) > 30 ? '...' : ''}"`,
      entry_id: entry.id,
      created_at: entry.created_at,
    });

    // Word bonus transactions
    const words = entry.word_count || 0;
    if (words >= 500) {
      transactions.push({
        id: `tx-${entry.id}-words`,
        user_id: entry.user_id,
        amount: POINTS_CONFIG.word_bonus_500,
        reason: "entry_word_bonus",
        description: `Deep reflection bonus (500+ words)`,
        entry_id: entry.id,
        created_at: entry.created_at,
      });
    } else if (words >= 300) {
      transactions.push({
        id: `tx-${entry.id}-words`,
        user_id: entry.user_id,
        amount: POINTS_CONFIG.word_bonus_300,
        reason: "entry_word_bonus",
        description: `Extended entry bonus (300+ words)`,
        entry_id: entry.id,
        created_at: entry.created_at,
      });
    } else if (words >= 100) {
      transactions.push({
        id: `tx-${entry.id}-words`,
        user_id: entry.user_id,
        amount: POINTS_CONFIG.word_bonus_100,
        reason: "entry_word_bonus",
        description: `Thoughtful entry bonus (100+ words)`,
        entry_id: entry.id,
        created_at: entry.created_at,
      });
    }
  });

  // Sort all transactions by date (most recent first) and limit
  return transactions
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

// GET: Fetch point transactions from backend
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

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

    // Try backend first
    try {
      const response = await axios.get(`${API_URL}/gamification/transactions?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      // If backend returns transactions, use them
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return NextResponse.json(response.data);
      }
    } catch (backendError) {
      console.warn(
        "Backend transactions API unavailable:",
        backendError instanceof Error ? backendError.message : "Unknown error"
      );
    }

    // Fallback: Generate transactions from actual entries
    try {
      const entriesResponse = await axios.get(`${API_URL}/entries`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      // Handle various response formats
      let entries: Entry[] = [];
      if (Array.isArray(entriesResponse.data)) {
        entries = entriesResponse.data;
      } else if (entriesResponse.data?.items && Array.isArray(entriesResponse.data.items)) {
        entries = entriesResponse.data.items;
      } else if (entriesResponse.data?.entries && Array.isArray(entriesResponse.data.entries)) {
        entries = entriesResponse.data.entries;
      }

      const transactions = generateTransactionsFromEntries(entries, limit);
      return NextResponse.json(transactions);
    } catch (entriesError) {
      console.warn(
        "Could not fetch entries for transaction generation:",
        entriesError instanceof Error ? entriesError.message : "Unknown error"
      );
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Gamification transactions API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
