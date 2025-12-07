import { NextResponse } from "next/server";
import { serverApiClient } from "@/lib/api-client";
import { shouldUseMockData } from "@/lib/mock-utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

// GET: Fetch daily prompt
export async function GET() {
  // Mock daily prompt with a thoughtful, engaging question
  const mockDailyPrompt = {
    prompt: {
      id: "daily1",
      text: "Today, pause and notice your surroundings with fresh eyes. What beauty or wonder exists in your everyday environment that you might typically overlook? How does bringing awareness to these details shift your perspective?",
      category: "mindfulness",
      created_at: new Date().toISOString(),
      tags: ["presence", "awareness", "gratitude"],
    },
  };

  // Check if we should use mock data
  if (shouldUseMockData()) {
    console.info("Using mock daily prompt data");
    return NextResponse.json(mockDailyPrompt);
  }

  try {
    // Get auth session for token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to get data from real backend
    try {
      const data = await serverApiClient(
        "/prompts/daily",
        session.accessToken as string,
      );
      return NextResponse.json(data);
    } catch (backendError) {
      // Log the error but don't fail - use mock data instead
      console.warn(
        "Failed to fetch daily prompt from backend, using mock data:",
        backendError,
      );

      // Return mock data as fallback
      return NextResponse.json(mockDailyPrompt);
    }
  } catch (error) {
    console.error("Daily prompt API error:", error);
    // Still return the mock prompt as fallback in case of any errors
    return NextResponse.json(mockDailyPrompt);
  }
}
