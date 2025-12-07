import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";

/**
 * Get server session with auth options
 * This is a convenience wrapper for App Router API routes
 */
export async function auth() {
  return getServerSession(authOptions);
}

export { authOptions };
