import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";

// Add this to make the route explicitly dynamic
export const dynamic = "force-dynamic";

// GET: Search for entries
export async function GET(request: Request) {
  try {
    // Get query params
    const { searchParams } = new URL(request.url);

    // Support both 'text' (backend) and 'q' (legacy) parameters
    const text = searchParams.get("text") || searchParams.get("q") || "";
    const tags = searchParams.get("tags");
    const from_date = searchParams.get("from_date");
    const to_date = searchParams.get("to_date");
    const mood = searchParams.get("mood");
    const sort_by = searchParams.get("sort_by");
    const limit = searchParams.get("limit");
    const page = searchParams.get("page");

    // Build query string for backend
    const queryParams = new URLSearchParams();
    if (text) queryParams.set("text", text);
    if (tags) queryParams.set("tags", tags);
    if (from_date) queryParams.set("from_date", from_date);
    if (to_date) queryParams.set("to_date", to_date);
    if (mood) queryParams.set("mood", mood);
    if (sort_by) queryParams.set("sort_by", sort_by);
    if (limit) queryParams.set("limit", limit);
    if (page) queryParams.set("page", page);

    const response = await apiRequest(
      `/entries/search?${queryParams.toString()}`,
    );
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, "Failed to search entries");
  }
}
