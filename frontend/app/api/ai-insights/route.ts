import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get("entryId");
  const type = searchParams.get("type") || "all";
  
  // Mock insights data based on query parameters
  let insights = [
    {
      id: "1",
      entry_id: "general",
      title: "Writing Patterns",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      content: "You\'ve mentioned \"balance\" and \"overwhelmed\" frequently in recent entries. Consider scheduling dedicated relaxation time to improve work-life balance.",
      source: "pattern-analysis",
      insight_type: "suggestions",
    },
    {
      id: "2",
      entry_id: "general",
      title: "Mood Improvement",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      content: "Your entries from this week show more optimistic language compared to your entries from last week. Your mood seems to be improving.",
      source: "sentiment-analysis",
      insight_type: "reflections",
    },
    {
      id: "3",
      entry_id: "general",
      title: "Project Progress",
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      content: "You\'ve been consistently writing about your mobile app project. There&apos;s a positive trend in your descriptions, suggesting good progress.",
      source: "topic-tracking",
      insight_type: "patterns",
    },
    {
      id: "4",
      entry_id: "general",
      title: "Gratitude Practice Suggestion",
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      content: "Consider starting a gratitude practice. You often mention positive experiences, but explicitly noting things you\'re grateful for can enhance wellbeing.",
      source: "content-analysis",
      insight_type: "suggestions",
    },
    {
      id: "5",
      entry_id: "general",
      title: "Morning Productivity",
      created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      content: "Based on timestamps, you tend to write more accomplished entries in the morning. Consider scheduling important tasks during your morning hours when possible.",
      source: "behavior-analysis",
      insight_type: "suggestions",
    }
  ];
  
  // If a specific entry is requested, filter insights for that entry
  if (entryId) {
    // In a real app, we would query the database for insights related to this entry
    insights = insights.map(insight => ({
      ...insight,
      entry_id: entryId
    })).slice(0, 2); // Simulate fewer insights for a specific entry
  }
  
  // Filter by insight type if specified
  if (type && type !== "all") {
    insights = insights.filter(insight => insight.insight_type === type);
  }
  
  // Simulate random errors occasionally to test fallback (only in development)
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
    return NextResponse.json(
      { error: "Simulated server error" },
      { status: 500 }
    );
  }
  
  return NextResponse.json(insights);
}

export async function POST() {
  // Mock response for generating new insights
  return NextResponse.json({ 
    success: true,
    message: "AI insights generation started. New insights will be available shortly."
  });
} 