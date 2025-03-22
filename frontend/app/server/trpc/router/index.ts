import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

export const appRouter = router({
  hello: publicProcedure.query(() => 'Hello tRPC'),
});

export type AppRouter = typeof appRouter;
