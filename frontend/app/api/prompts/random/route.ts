import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";
import { getAuthSession } from "@/lib/auth-utils";

// GET: Fetch random prompt
export async function GET() {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Forward request to backend API
    const response = await apiRequest("/prompts/random");
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, "Failed to fetch random prompt");
  }
}
