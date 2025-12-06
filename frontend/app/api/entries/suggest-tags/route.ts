import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";
import { getAuthSession } from "@/lib/auth-utils";

// POST: Suggest tags based on content
export async function POST(request: Request) {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    // Forward request to backend API
    const response = await apiRequest("/entries/suggest-tags", "POST", {
      content: body.content,
      existing_tags: body.existing_tags || [],
    });

    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, "Failed to suggest tags");
  }
}
