import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";
import { getAuthSession } from "@/lib/auth-utils";
import { getSession } from "next-auth/react";
import { serverApiClient } from "@/lib/api-client";
import { shouldUseMockData } from "@/lib/mock-utils";

// Mock prompts data for fallback
const mockPrompts = {
  prompts: [
    {
      id: "prompt1",
      text: "Reflect on a moment in the past week when you felt truly at peace. What elements were present that created this feeling? How might you intentionally recreate similar moments?",
      category: "reflective",
      created_at: "2023-03-01T00:00:00Z",
      tags: ["peace", "mindfulness", "reflection"],
    },
    {
      id: "prompt2",
      text: "Consider three people who have positively influenced your life this year. What specific qualities or actions of theirs are you grateful for? Have you expressed this gratitude to them?",
      category: "gratitude",
      created_at: "2023-03-02T00:00:00Z",
      tags: ["relationships", "appreciation", "gratitude"],
    },
    {
      id: "prompt3",
      text: "If you could have a conversation with yourself from five years ago, what would surprise them most about who you've become? What advice would you give them about the journey ahead?",
      category: "reflective",
      created_at: "2023-03-03T00:00:00Z",
      tags: ["growth", "self-awareness", "perspective"],
    },
    {
      id: "prompt4",
      text: "Think about a challenge you\'re currently facing. Write about it from the perspective of someone ten years in the future looking back. What wisdom does that future self offer?",
      category: "growth",
      created_at: "2023-03-04T00:00:00Z",
      tags: ["problem-solving", "perspective", "future-self"],
    },
    {
      id: "prompt5",
      text: "Imagine you could write a letter that your great-grandchildren might read someday. What would you want them to know about your life, your values, and the world you lived in?",
      category: "creative",
      created_at: "2023-03-05T00:00:00Z",
      tags: ["legacy", "values", "perspective"],
    },
    {
      id: "prompt6",
      text: "Take a moment to notice the small joys in your daily routine that you might typically overlook. What three seemingly mundane aspects of your life would you deeply miss if they were gone?",
      category: "gratitude",
      created_at: "2023-03-06T00:00:00Z",
      tags: ["mindfulness", "appreciation", "daily-life"],
    },
    {
      id: "prompt7",
      text: "If you were to create a perfect day for nurturing your wellbeing - physical, emotional, and mental - what would it include? What prevents you from incorporating these elements more regularly?",
      category: "creative",
      created_at: "2023-03-07T00:00:00Z",
      tags: ["self-care", "balance", "wellness"],
    },
    {
      id: "prompt8",
      text: "Consider a belief or habit that has been limiting your growth. What first step could you take today to begin changing it? What support might you need in this process?",
      category: "growth",
      created_at: "2023-03-08T00:00:00Z",
      tags: ["habits", "change", "personal-development"],
    },
    {
      id: "prompt9",
      text: "Think about a book, film, or conversation that significantly changed your perspective on something important. What made this particular influence so powerful for you?",
      category: "reflective",
      created_at: "2023-03-09T00:00:00Z",
      tags: ["influences", "perspective", "media"],
    },
    {
      id: "prompt10",
      text: "What activities or experiences make you lose track of time in the best possible way? When was the last time you experienced this state of flow, and how might you create more opportunities for it?",
      category: "growth",
      created_at: "2023-03-10T00:00:00Z",
      tags: ["flow", "passion", "engagement"],
    },
  ],
};

// GET: Fetch all prompts
export async function GET() {
  // Check if we should use mock data
  if (shouldUseMockData()) {
    console.info("Using mock prompts data");
    return NextResponse.json(mockPrompts);
  }

  try {
    // Get auth session for token
    const session = await getSession();
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to get data from real backend
    try {
      const data = await serverApiClient(
        "/prompts",
        session.accessToken as string,
      );
      return NextResponse.json(data);
    } catch (backendError) {
      // Log the error but don't fail - use mock data instead
      console.warn(
        "Failed to fetch prompts from backend, using mock data:",
        backendError,
      );

      // Return mock data as fallback
      return NextResponse.json(mockPrompts);
    }
  } catch (error) {
    console.error("Prompts API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: Create a new prompt (admin only)
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
    if (!body.text || !body.category) {
      return NextResponse.json(
        { error: "Text and category are required" },
        { status: 400 },
      );
    }

    // Forward request to backend API
    const response = await apiRequest("/prompts", "POST", body);

    // Return created prompt with 201 status
    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Failed to create prompt");
  }
}
