// app/hooks/useTRPC.ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/app/server/api/routers"; // This is the correct path

// Export type-safe hooks
export const trpc = createTRPCReact<AppRouter>();
