import { initTRPC } from "@trpc/server";
import { z } from "zod";
import superjson from "superjson";

// Define context type
type Context = {
  session: any;
  req: Request;
};

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Export procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure; // In a real app, this would check auth

// Sample mock data for journal entries with authentic content
const mockJournalEntries = [
  {
    id: "1",
    title: "Finding Peace in Chaos",
    content:
      "Today was completely overwhelming. My deadline at work got moved up by a week, and my inbox is overflowing with messages I haven't had time to answer. I felt that familiar tightness in my chest all day.\n\n" +
      "I did manage to take 10 minutes this morning to meditate though. Just sitting and breathing helped center me a bit. I need to remember that even small moments of mindfulness make a difference.\n\n" +
      "Tomorrow I'll try to wake up 30 minutes earlier to plan my day better. One day at a time.",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    mood: "anxious",
    tags: ["work", "self-care", "meditation"],
  },
  {
    id: "2",
    title: "Unexpected Connection",
    content:
      "I ran into Sam at the coffee shop today. We haven't spoken since college graduation four years ago, but it felt like no time had passed at all. We ended up talking for almost two hours.\n\n" +
      "It's strange how some friendships can pick up exactly where they left off. Sam mentioned they've been going through a tough time with their family lately. I'm glad I was there to listen.\n\n" +
      "We exchanged numbers and promised to meet up again soon. I hope we actually follow through this time. These chance encounters remind me how small the world can be sometimes.",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    mood: "grateful",
    tags: ["friendship", "connection", "nostalgia"],
  },
  {
    id: "3",
    title: "Morning Walk Revelations",
    content:
      "Woke up at 5:30am today and couldn't fall back asleep. Instead of scrolling through my phone for hours, I decided to take a long walk through the park as the sun was rising.\n\n" +
      "The world feels completely different at that hour - quieter, full of possibility. I saw an elderly couple holding hands on a bench, and it made me think about what kind of life I want to build for myself.\n\n" +
      "I've been stuck in this job for three years now. Maybe it's time to seriously look into that graphic design course I've been thinking about. The thought is both terrifying and exciting.",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    mood: "contemplative",
    tags: ["future", "career", "nature"],
  },
  {
    id: "4",
    title: "Small Victory",
    content:
      "I finally cleaned out my closet today! It's been on my to-do list for literally months. Found clothes I forgot I even owned and filled three bags to donate.\n\n" +
      "It feels so good to look at that organized space now. I know it seems like such a small thing, but lately I've been feeling overwhelmed by everything, so completing any task feels like a win.\n\n" +
      "Mom called while I was in the middle of it. She's worried about Dad's health again. Trying not to spiral thinking about it. One thing at a time.",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    mood: "accomplished",
    tags: ["home", "organization", "family"],
  },
  {
    id: "5",
    title: "Rainy Day Thoughts",
    content:
      "It's been raining all day. I made tea and sat by the window watching drops run down the glass. There's something so calming about rainy days - they give you permission to slow down.\n\n" +
      "I've been thinking a lot about where I was this time last year. So much has changed, yet so much feels the same. Sometimes I wonder if I'm really moving forward or just going in circles.\n\n" +
      "Read that book Alex recommended. The main character reminded me so much of myself it was almost uncomfortable. Isn't it strange how fiction can sometimes feel more real than reality?",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    mood: "reflective",
    tags: ["weather", "books", "introspection"],
  },
];

// Define the app router with procedures
// tRPC serves as a fallback mock data provider when REST API is unavailable
export const appRouter = router({
  hello: publicProcedure.query(() => "Hello tRPC"),

  // Returns mock journal entries as fallback when REST API fails
  getJournalEntries: publicProcedure.query(async () => {
    // Return mock data - this is used as fallback when REST API is unavailable
    return mockJournalEntries;
  }),

  // Returns a single mock entry by ID as fallback
  getJournalEntry: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      // Return mock data - this is used as fallback when REST API is unavailable
      return mockJournalEntries.find((entry) => entry.id === input.id);
    }),
});

// Export type definition of API
export type AppRouter = typeof appRouter;
