import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";
import { getAuthSession } from "@/lib/auth-utils";

// GET: Fetch daily prompt
export async function GET() {
  // Mock daily prompt
  const mockDailyPrompt = {
    prompt: {
      id: 'daily1',
      text: "What are three moments from today that you want to remember?",
      category: 'reflective',
      created_at: '2023-03-30T00:00:00Z',
      tags: ['gratitude', 'mindfulness']
    }
  };

  return NextResponse.json(mockDailyPrompt);
}
