import { NextResponse } from 'next/server';
import { getAuthSession, isAuthenticated } from './auth-utils';

export type NextRouteHandler<T = any> = (
  request: Request,
  context: { params: T }
) => Promise<NextResponse>;

/**
 * Middleware wrapper to ensure routes are authenticated
 */
export function withAuth<T = any>(handler: NextRouteHandler<T>): NextRouteHandler<T> {
  return async (request: Request, context: { params: T }) => {
    const session = await getAuthSession();
    
    if (!isAuthenticated(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return handler(request, context);
  };
}

/**
 * Helper function to get the request body as JSON for POST/PUT requests
 */
export async function getRequestBody<T = any>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch (error) {
    console.error('Error parsing request body:', error);
    throw new Error('Invalid request body');
  }
} 