import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

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

// Create your app router
export const appRouter = router({
  // Define your procedures here
  // example: t.procedure.query(() => 'Hello World'),
});

// Export type
export type AppRouter = typeof appRouter; 