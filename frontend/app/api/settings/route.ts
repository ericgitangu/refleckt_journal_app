import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";
import { getAuthSession } from "@/lib/auth-utils";

// GET: Fetch user settings
export async function GET() {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Forward request to backend API
    const response = await apiRequest("/settings");
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, "Failed to fetch settings");
  }
}

// PUT: Update settings
export async function PUT(request: Request) {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Forward request to backend API
    const response = await apiRequest("/settings", "PUT", body);
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, "Failed to update settings");
  }
}
