import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { z } from 'zod';

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
}

// Create your app router
export const appRouter = router({
  // Get journal entries
  getJournalEntries: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).nullish(),
      cursor: z.string().nullish(),
    }).nullish())
    .query(async ({ input, ctx }) => {
      // Mock data for example
      return {
        items: [
          { id: '1', title: 'First Entry', content: 'This is my first journal entry', createdAt: new Date() },
          { id: '2', title: 'Second Entry', content: 'This is my second journal entry', createdAt: new Date() },
        ],
        nextCursor: null,
      };
    }),
    
  // Add journal entry
  addJournalEntry: publicProcedure
    .input(z.object({
      title: z.string().min(1),
      content: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // In a real app, you would save to a database here
      // For example purposes just returning the input with a mock ID
      return {
        id: 'new-id-' + Date.now(),
        ...input,
        createdAt: new Date(),
      };
    }),
});

// Export type
export type AppRouter = typeof appRouter; 