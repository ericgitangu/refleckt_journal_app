import { NextResponse } from "next/server";
import { shouldUseMockData } from "@/lib/mock-utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import axios from "axios";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

// Collection of thoughtful random prompts for fallback
const randomPrompts = [
  {
    id: "random1",
    text: "What small moment today brought you unexpected joy? How can you create more of these moments?",
    category: "gratitude",
    created_at: new Date().toISOString(),
    tags: ["joy", "mindfulness", "reflection"],
  },
  {
    id: "random2",
    text: "If you could give advice to your younger self, what would it be? What wisdom have you gained?",
    category: "self-discovery",
    created_at: new Date().toISOString(),
    tags: ["wisdom", "growth", "perspective"],
  },
  {
    id: "random3",
    text: "What challenge are you currently facing? How might you approach it with curiosity rather than frustration?",
    category: "growth",
    created_at: new Date().toISOString(),
    tags: ["challenges", "mindset", "resilience"],
  },
  {
    id: "random4",
    text: "Describe a relationship that has shaped who you are today. What have you learned from this person?",
    category: "relationships",
    created_at: new Date().toISOString(),
    tags: ["connection", "gratitude", "learning"],
  },
  {
    id: "random5",
    text: "What does your ideal day look like? What small steps can you take to create more of those elements?",
    category: "vision",
    created_at: new Date().toISOString(),
    tags: ["goals", "intention", "planning"],
  },
];

// GET: Fetch random prompt
export async function GET() {
  // Get a random mock prompt
  const getRandomMockPrompt = () => {
    const randomIndex = Math.floor(Math.random() * randomPrompts.length);
    return { prompt: randomPrompts[randomIndex] };
  };

  // Check if we should use mock data
  if (shouldUseMockData()) {
    console.info("Using mock random prompt data");
    return NextResponse.json(getRandomMockPrompt());
  }

  try {
    // Get auth session for token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      // Return mock data when not authenticated instead of 401
      console.info("No session, using mock random prompt data");
      return NextResponse.json(getRandomMockPrompt());
    }

    // Try to get data from real backend
    try {
      const response = await axios.get(`${API_URL}/prompts/random`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });
      return NextResponse.json(response.data);
    } catch (backendError) {
      // Log the error but don't fail - use mock data instead
      console.warn(
        "Failed to fetch random prompt from backend, using mock data:",
        backendError,
      );

      // Return mock data as fallback
      return NextResponse.json(getRandomMockPrompt());
    }
  } catch (error) {
    console.error("Random prompt API error:", error);
    // Still return the mock prompt as fallback in case of any errors
    return NextResponse.json(getRandomMockPrompt());
  }
}
