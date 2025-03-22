import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '@/server/trpc/router';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const handler = createNextApiHandler({
    router: appRouter,
    createContext: () => ({}),
  });
  return handler(request);
}

export async function GET(request: Request) {
  const handler = createNextApiHandler({
    router: appRouter,
    createContext: () => ({}),
  });
  return handler(request);
}
