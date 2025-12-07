import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

// GET: Fetch mood analytics data
export async function GET() {
  try {
    const response = await apiRequest("/analytics/mood");
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, "Failed to fetch mood analytics");
  }
}
