import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/app/server/api/routers";

export const runtime = "nodejs";

// Define context for tRPC handler
const createContext = async (req: Request) => {
  return {
    session: null,
    req
  };
};

// Required for Next.js App Router API routes
export async function GET(req: Request) {
  return handler(req);
}

export async function POST(req: Request) {
  return handler(req);
}

// Common handler for both GET and POST requests
const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
            );
          }
        : undefined,
  });
};
