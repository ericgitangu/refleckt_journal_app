import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { ApiError } from "@/lib/api";
import { createServerComponentClient } from "@/lib/api/server-client";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse the request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate required fields
    const { category } = requestBody;
    if (!category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    // Create API client with authentication
    const apiClient = createServerComponentClient(session);
    
    // Forward the request to the backend prompts service
    const response = await apiClient.post(
      `/prompts/generate`,
      requestBody
    );

    // Return the generated prompts
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error generating prompts:", error);

    // Handle specific API errors
    if (error instanceof ApiError) {
      if (error.status === 503) {
        return NextResponse.json(
          { error: "AI service temporarily unavailable" },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    // Default error response
    return NextResponse.json(
      { error: "Failed to generate prompts" },
      { status: 500 }
    );
  }
} 