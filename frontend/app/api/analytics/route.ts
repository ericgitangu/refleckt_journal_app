import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { serverApiClient } from "@/lib/api-client";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

// GET: Fetch analytics data from real backend
export async function GET(req: Request) {
  try {
    // Get auth session using correct getServerSession syntax
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters from the URL
    const { searchParams } = new URL(req.url);
    const time_period = searchParams.get("time_period") || "month";

    // Get token from session
    const token = (session as { accessToken?: string }).accessToken;
    if (!token) {
      return NextResponse.json(
        { error: "No access token available" },
        { status: 401 }
      );
    }

    // Call the backend API
    const data = await serverApiClient(
      `/analytics?time_period=${time_period}`,
      token
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Analytics API error:", error);

    // Return a structured error response, not mock data
    return NextResponse.json(
      {
        error: "Failed to fetch analytics",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// POST: Request a new analytics computation
export async function POST(req: Request) {
  try {
    // Get authentication session
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

    // Forward request to backend API
    const data = await serverApiClient("/analytics", token, {
      method: "POST",
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Analytics POST error:", error);
    return NextResponse.json(
      { error: "Failed to request analytics computation" },
      { status: 500 }
    );
  }
}
