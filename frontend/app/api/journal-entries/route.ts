import { NextResponse } from "next/server";

export async function GET() {
  // Authentic mock data for journal entries
  const entries = [
    {
      id: "1",
      title: "Finding Peace in Chaos",
      content:
        "Today was overwhelming. Work deadlines piling up, and my apartment is a mess. I took 10 minutes to meditate this morning though, and it helped center me. Need to remember that taking small pauses throughout the day makes a huge difference. I\'m going to try implementing a 5-minute break every two hours tomorrow and see if it helps with my anxiety.",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      mood: "anxious",
      tags: ["work", "self-care", "meditation"],
    },
    {
      id: "2",
      title: "Unexpected Connection",
      content:
        "Ran into Sam at the coffee shop today. We haven\'t spoken since college, but it felt like no time had passed. We talked for nearly two hours about our careers, relationships, and dreams we still haven\'t given up on. It made me realize how many connections I\'ve let slip away over the years. I want to be more intentional about reaching out to old friends. Maybe I\'ll make a list of people to contact this weekend.",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      mood: "reflective",
      tags: ["friendship", "connection", "nostalgia"],
    },
    {
      id: "3",
      title: "Morning Walk Revelations",
      content:
        "Woke up early and took a long walk through the park as the sun was rising. The world feels different at that hour - quieter, full of possibility. I\'ve been struggling with the decision about taking that new job offer. During my walk, I realized I\'ve been asking the wrong question. Instead of \'Which job has better pay/title?\', I should be asking \'Which path will help me grow in the ways I want to?\'. Feeling clearer now.",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      mood: "hopeful",
      tags: ["nature", "decisions", "career"],
    },
    {
      id: "4",
      title: "That Difficult Conversation",
      content:
        "Finally had the talk with Alex that I\'ve been avoiding for weeks. It was uncomfortable and there were moments of tension, but ultimately I\'m glad we cleared the air. I expressed my boundaries about our friendship, and they shared frustrations I wasn\'t aware of. I\'m learning that temporary discomfort during honest conversations is worth the deeper understanding that comes after. We\'re planning to grab dinner next week with a fresh start.",
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago
      mood: "relieved",
      tags: ["relationships", "communication", "growth"],
    },
    {
      id: "5",
      title: "Small Victory Worth Celebrating",
      content:
        "I\'ve been trying to build a consistent yoga practice for months now, always giving up after a week or two. Today marks 30 consecutive days of at least 15 minutes on the mat. Some days were just gentle stretching when I was tired, but I showed up. I\'m proud of sticking with it even when I didn\'t feel like it. My body feels stronger and my mind clearer. Small, consistent efforts really do add up over time.",
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
      mood: "proud",
      tags: ["habits", "yoga", "consistency"],
    },
  ];

  return NextResponse.json({
    items: entries,
    nextCursor: null,
  });
}

export async function POST(request: Request) {
  const data = await request.json();

  // Validate required fields
  if (!data.title || !data.content) {
    return NextResponse.json(
      { error: "Title and content are required" },
      { status: 400 },
    );
  }

  // Create a new entry with additional fields
  const newEntry = {
    id: `new-${Date.now()}`,
    title: data.title,
    content: data.content,
    createdAt: new Date().toISOString(),
    mood: data.mood || null,
    tags: data.tags || [],
  };

  return NextResponse.json(newEntry, { status: 201 });
}
