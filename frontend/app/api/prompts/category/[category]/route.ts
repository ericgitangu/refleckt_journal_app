import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";
import { getAuthSession } from "@/lib/auth-utils";

interface CategoryParams {
  params: {
    category: string;
  };
}

const allPrompts = {
  reflective: [
    {
      id: 'prompt1',
      text: "What is something you accomplished today that you&apos;re proud of, even if it seems small?",
      category: 'reflective',
      created_at: '2023-03-01T00:00:00Z',
      tags: ['gratitude', 'self-reflection']
    },
    {
      id: 'prompt3',
      text: "If you could give advice to yourself from one year ago, what would you say?",
      category: 'reflective',
      created_at: '2023-03-03T00:00:00Z',
      tags: ['growth', 'self-awareness']
    }
  ],
  gratitude: [
    {
      id: 'prompt2',
      text: "Write about something you&apos;re looking forward to in the coming week.",
      category: 'gratitude',
      created_at: '2023-03-02T00:00:00Z',
      tags: ['future', 'positivity']
    },
    {
      id: 'prompt6',
      text: "What are three things you&apos;re grateful for today and why?",
      category: 'gratitude',
      created_at: '2023-03-06T00:00:00Z',
      tags: ['gratitude', 'positivity']
    }
  ],
  creative: [
    {
      id: 'prompt5',
      text: "Write a letter to your future self, five years from now.",
      category: 'creative',
      created_at: '2023-03-05T00:00:00Z',
      tags: ['future', 'goals']
    },
    {
      id: 'prompt7',
      text: "What would make today great? Write as if you&apos;re planning your ideal day.",
      category: 'creative',
      created_at: '2023-03-07T00:00:00Z',
      tags: ['planning', 'motivation']
    }
  ],
  growth: [
    {
      id: 'prompt4',
      text: "Describe a challenge you&apos;re currently facing and three possible approaches to addressing it.",
      category: 'growth',
      created_at: '2023-03-04T00:00:00Z',
      tags: ['problem-solving', 'planning']
    },
    {
      id: 'prompt8',
      text: "What&apos;s a small habit you&apos;d like to develop, and how can you take the first step today?",
      category: 'growth',
      created_at: '2023-03-08T00:00:00Z',
      tags: ['habits', 'improvement']
    }
  ]
};

// GET: Fetch prompts by category
export async function GET(
  request: Request,
  { params }: { params: { category: string } }
) {
  const category = params.category.toLowerCase();
  
  // Check if the category exists in our mock data
  if (category !== 'all' && !allPrompts[category as keyof typeof allPrompts]) {
    return NextResponse.json({
      prompts: []
    });
  }
  
  // Return all prompts or filtered by category
  const prompts = category === 'all'
    ? Object.values(allPrompts).flat()
    : allPrompts[category as keyof typeof allPrompts];
  
  return NextResponse.json({ prompts });
}
