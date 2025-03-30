import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";
import { getAuthSession } from "@/lib/auth-utils";
import { getSession } from 'next-auth/react';
import { serverApiClient } from '@/lib/api-client';
import { shouldUseMockData } from '@/lib/mock-utils';

// Mock prompts data for fallback
const mockPrompts = {
  prompts: [
    {
      id: 'prompt1',
      text: "What is something you accomplished today that you&apos;re proud of, even if it seems small?",
      category: 'reflective',
      created_at: '2023-03-01T00:00:00Z',
      tags: ['gratitude', 'self-reflection']
    },
    {
      id: 'prompt2',
      text: "Write about something you&apos;re looking forward to in the coming week.",
      category: 'gratitude',
      created_at: '2023-03-02T00:00:00Z',
      tags: ['future', 'positivity']
    },
    {
      id: 'prompt3',
      text: "If you could give advice to yourself from one year ago, what would you say?",
      category: 'reflective',
      created_at: '2023-03-03T00:00:00Z',
      tags: ['growth', 'self-awareness']
    },
    {
      id: 'prompt4',
      text: "Describe a challenge you&apos;re currently facing and three possible approaches to addressing it.",
      category: 'growth',
      created_at: '2023-03-04T00:00:00Z',
      tags: ['problem-solving', 'planning']
    },
    {
      id: 'prompt5',
      text: "Write a letter to your future self, five years from now.",
      category: 'creative',
      created_at: '2023-03-05T00:00:00Z',
      tags: ['future', 'goals']
    },
    {
      id: 'prompt6',
      text: "What are three things you&apos;re grateful for today and why?",
      category: 'gratitude',
      created_at: '2023-03-06T00:00:00Z',
      tags: ['gratitude', 'positivity']
    },
    {
      id: 'prompt7',
      text: "What would make today great? Write as if you&apos;re planning your ideal day.",
      category: 'creative',
      created_at: '2023-03-07T00:00:00Z',
      tags: ['planning', 'motivation']
    },
    {
      id: 'prompt8',
      text: "What&apos;s a small habit you&apos;d like to develop, and how can you take the first step today?",
      category: 'growth',
      created_at: '2023-03-08T00:00:00Z',
      tags: ['habits', 'improvement']
    },
  ]
};

// GET: Fetch all prompts
export async function GET() {
  // Check if we should use mock data
  if (shouldUseMockData()) {
    console.info('Using mock prompts data');
    return NextResponse.json(mockPrompts);
  }
  
  try {
    // Get auth session for token
    const session = await getSession();
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Try to get data from real backend
    try {
      const data = await serverApiClient('/prompts', session.accessToken as string);
      return NextResponse.json(data);
    } catch (backendError) {
      // Log the error but don't fail - use mock data instead
      console.warn('Failed to fetch prompts from backend, using mock data:', backendError);
      
      // Return mock data as fallback
      return NextResponse.json(mockPrompts);
    }
  } catch (error) {
    console.error('Prompts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
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
