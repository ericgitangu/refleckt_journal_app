import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { serverApiClient } from "@/lib/api-client";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

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

    try {
      const data = await serverApiClient(
        `/gamification/transactions?limit=${limit}`,
        token
      );
      return NextResponse.json(data);
    } catch (backendError) {
      // New users have no transactions - return empty array
      console.warn(
        "Backend transactions API error:",
        backendError instanceof Error ? backendError.message : "Unknown error"
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
