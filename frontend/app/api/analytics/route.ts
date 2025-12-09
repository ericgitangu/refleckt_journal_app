import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import axios from "axios";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "";

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
    const response = await axios.get(`${API_URL}/analytics?time_period=${time_period}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    return NextResponse.json(response.data);
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
    const response = await axios.post(`${API_URL}/analytics`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Analytics POST error:", error);
    return NextResponse.json(
      { error: "Failed to request analytics computation" },
      { status: 500 }
    );
  }
}
