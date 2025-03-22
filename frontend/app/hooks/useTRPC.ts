// app/hooks/useTRPC.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/app/server/api/routers'; // Adjust path to your server router type

// Export type-safe hooks
export const trpc = createTRPCReact<AppRouter>();
