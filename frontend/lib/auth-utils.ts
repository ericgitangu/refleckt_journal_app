import getServerSession from 'next-auth';
import { Session } from '@/types/api';
import { authOptions } from '@/lib/auth/auth-options';

/**
 * Get the server session with typechecking
 */
export async function getAuthSession(): Promise<Session | null> {
  // For Next.js App Router, use the auth() function directly instead
  try {
    const session = await getServerSession(authOptions) as Session | null;
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
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