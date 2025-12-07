import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";
import { getAuthSession } from "@/lib/auth-utils";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

interface PromptParams {
  params: {
    id: string;
  };
}

// GET: Fetch a specific prompt by ID
export async function GET(request: Request, { params }: PromptParams) {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate id parameter
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Prompt ID is required" },
        { status: 400 },
      );
    }

    // Forward request to backend API
    const response = await apiRequest(`/prompts/${id}`);
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, "Failed to fetch prompt");
  }
}

// PUT: Update a specific prompt by ID (admin only)
export async function PUT(request: Request, { params }: PromptParams) {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate id parameter
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Prompt ID is required" },
        { status: 400 },
      );
    }

    // Parse request body
    const body = await request.json();

    // Forward request to backend API
    const response = await apiRequest(`/prompts/${id}`, "PUT", body);
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error, "Failed to update prompt");
  }
}

// DELETE: Delete a specific prompt by ID (admin only)
export async function DELETE(request: Request, { params }: PromptParams) {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate id parameter
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Prompt ID is required" },
        { status: 400 },
      );
    }

    // Forward request to backend API
    const response = await apiRequest(`/prompts/${id}`, "DELETE");
    return NextResponse.json({}, { status: 204 });
  } catch (error) {
    return handleApiError(error, "Failed to delete prompt");
  }
}
