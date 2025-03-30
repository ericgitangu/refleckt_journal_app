import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";

// Create context type - adjust based on your needs
type Context = {
  session: { userId: string } | null;
};

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Export procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Define journal entry interface for type safety
export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  mood?: string;
  tags?: string[];
}

// Create your app router
export const appRouter = router({
  // Get journal entries
  getJournalEntries: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).nullish(),
          cursor: z.string().nullish(),
        })
        .nullish(),
    )
    .query(async ({ input, ctx }) => {
      // Mock data for example
      return {
        items: [
          {
            id: "1",
            title: "Finding Peace in Chaos",
            content: "Today was overwhelming. Work deadlines piling up, and my apartment is a mess. I took 10 minutes to meditate this morning though, and it helped center me.",
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            mood: "anxious",
            tags: ["work", "self-care", "meditation"]
          },
          {
            id: "2",
            title: "Unexpected Connection",
            content: "Ran into Sam at the coffee shop today. We haven't spoken since college, but it felt like no time had passed.",
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            mood: "reflective",
            tags: ["friendship", "connection", "nostalgia"]
          },
          {
            id: "3",
            title: "Morning Walk Revelations",
            content: "Woke up early and took a long walk through the park as the sun was rising. The world feels different at that hour - quieter, full of possibility.",
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            mood: "hopeful",
            tags: ["nature", "decisions", "career"]
          },
        ],
        nextCursor: null,
      };
    }),

  // Add journal entry
  addJournalEntry: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        mood: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // In a real app, you would save to a database here
      // For example purposes just returning the input with a mock ID
      return {
        id: "new-id-" + Date.now(),
        ...input,
        createdAt: new Date(),
      };
    }),
});

// Export type
export type AppRouter = typeof appRouter;
