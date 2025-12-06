import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";
import { getAuthSession } from "@/lib/auth-utils";

// Add this to make the route explicitly dynamic
export const dynamic = "force-dynamic";

// GET: Get all tags with counts
export async function GET() {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Forward request to backend API
    const response = await apiRequest("/entries/tags");
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, "Failed to fetch tags");
  }
}
