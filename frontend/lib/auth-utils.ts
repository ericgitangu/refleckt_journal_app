import { getServerSession } from "next-auth";
import { Session } from "@/types/api";
import { authOptions } from "@/lib/auth/auth-options";

/**
 * Get the server session with typechecking
 */
export async function getAuthSession(): Promise<Session | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return null;
    }
    // Map next-auth session to our Session type
    return {
      user: {
        id: session.user?.email || "",
        email: session.user?.email || "",
        name: session.user?.name || "",
        image: session.user?.image || undefined,
        accessToken: (session as any).accessToken || "",
      },
      expires: session.expires,
    } as Session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Get the access token from the session
 */
export function getAccessToken(session: Session | null): string | null {
  return session?.user?.accessToken || null;
}

/**
 * Helper to check if user is authenticated
 */
export function isAuthenticated(session: Session | null): boolean {
  return !!session?.user?.accessToken;
}
