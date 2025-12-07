import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

// GET: Fetch all categories
export async function GET() {
  try {
    const response = await apiRequest("/settings/categories");
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, "Failed to fetch categories");
  }
}

// POST: Create a new category
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await apiRequest("/settings/categories", "POST", body);
    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Failed to create category");
  }
}
