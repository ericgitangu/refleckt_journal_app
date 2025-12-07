import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { serverApiClient } from "@/lib/api-client";

// GET: Fetch gamification stats from backend
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = (session as { accessToken?: string }).accessToken;
    if (!token) {
      return NextResponse.json(
        { error: "No access token available" },
        { status: 401 }
      );
    }

    const data = await serverApiClient("/gamification/stats", token);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Gamification stats API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch gamification stats",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
