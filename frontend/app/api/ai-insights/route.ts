import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get("entryId");
  
  if (!entryId) {
    return NextResponse.json(
      { error: "entryId is required" },
      { status: 400 }
    );
  }
  
  // Mock insights data for the requested entry
  const insights = [
    {
      id: "1",
      entry_id: entryId,
      created_at: new Date().toISOString(),
      content: "You&apos;ve mentioned \"balance\" and \"overwhelmed\" frequently in recent entries. Consider scheduling dedicated relaxation time to improve work-life balance.",
      source: "pattern-analysis",
      insight_type: "suggestions",
    },
    {
      id: "2",
      entry_id: entryId,
      created_at: new Date().toISOString(),
      content: "This entry shows more optimistic language compared to your entries from last week.",
      source: "sentiment-analysis",
      insight_type: "reflections",
    },
    {
      id: "3",
      entry_id: entryId,
      created_at: new Date().toISOString(),
      content: "You&apos;ve been consistently writing about your mobile app project. There&apos;s a positive trend in your descriptions, suggesting good progress.",
      source: "topic-tracking",
      insight_type: "observations",
    },
    {
      id: "4",
      entry_id: entryId,
      created_at: new Date().toISOString(),
      content: "Consider starting a gratitude practice. You often mention positive experiences, but explicitly noting things you&apos;re grateful for can enhance wellbeing.",
      source: "content-analysis",
      insight_type: "suggestions",
    }
  ];
  
  return NextResponse.json(insights);
}

export async function POST() {
  // Mock response for generating new insights
  return NextResponse.json({ 
    success: true,
    message: "AI insights generation started. New insights will be available shortly."
  });
} 