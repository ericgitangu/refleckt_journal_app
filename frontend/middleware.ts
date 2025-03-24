import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/dist/server/web/spec-extension/request';
import { getToken } from 'next-auth/jwt';

// Public routes that don't require authentication
const publicRoutes = ['/api/health', '/api/config', '/login', '/signup', '/auth'];

// AWS X-Ray headers
const AWS_HEADERS = [
  'x-amz-trace-id',
  'x-amz-id-trace',
  'x-amz-request-id',
  'x-amz-id-2',
  'x-amz-cf-id',
  'x-amz-cloudfront-id',
  'x-amz-cognito-identity-id',
  'x-amz-user-id',
  'x-amz-identity-id',
];

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_FRONTEND_URL || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': [
    'Content-Type',
    'Authorization',
    'X-Amz-Date',
    'X-Api-Key',
    'X-Amz-Security-Token',
    'X-Amz-User-Agent',
    ...AWS_HEADERS,
  ].join(','),
  'Access-Control-Max-Age': '86400',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // Check if the route is public
  if (publicRoutes.includes(pathname)) {
    const response = NextResponse.next();
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Verify authentication for protected routes
  const token = await getToken({ req: request });
  if (!token) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Get the response for authenticated routes
  const response = NextResponse.next();

  // Add CORS headers to all responses
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Forward AWS headers if present
  AWS_HEADERS.forEach(header => {
    const value = request.headers.get(header);
    if (value) {
      response.headers.set(header, value);
    }
  });

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Request:', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
    });
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 