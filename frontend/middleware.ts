import { NextResponse } from "next/server";
import type { NextRequest } from "next/dist/server/web/spec-extension/request";
import { getToken } from "next-auth/jwt";

// Public routes that don't require authentication
const publicRoutes = [
  "/", // Root path
  "/api/health",
  "/api/config",
  "/login",
  "/signup",
  "/auth",
  "/privacy",
  "/terms",
];

// Static assets that should be publicly accessible
const staticAssets = [
  "/logo.jpg",
  "/google-logo.svg",
  "/opengraph-image.jpg",
  "/manifest.json",
  "/sw.js",
  "/site.webmanifest",
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png", 
  "/apple-touch-icon.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/robots.txt",
];

// API routes that need special handling
const apiRoutes = [
  "/api/auth",
  "/api/trpc",
];

// Social media crawler bot user agents to allow
const socialBots = [
  'facebookexternalhit',
  'linkedinbot',
  'twitterbot',
  'whatsapp',
  'telegrambot',
  'pinterest',
  'vkshare',
  'facebot',
  'outbrain',
  'w3c_validator',
  'slackbot',
  'embedly',
  'snapchat',
];

// AWS X-Ray headers
const AWS_HEADERS = [
  "x-amz-trace-id",
  "x-amz-id-trace",
  "x-amz-request-id",
  "x-amz-id-2",
  "x-amz-cf-id",
  "x-amz-cloudfront-id",
  "x-amz-cognito-identity-id",
  "x-amz-user-id",
  "x-amz-identity-id",
];

// CORS headers
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_FRONTEND_URL || "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": [
    "Content-Type",
    "Authorization",
    "X-Amz-Date",
    "X-Api-Key",
    "X-Amz-Security-Token",
    "X-Amz-User-Agent",
  ].join(","),
  "Access-Control-Max-Age": "86400",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Log the request in development for debugging
  if (process.env.NODE_ENV === "development") {
    console.log(`[Middleware] Processing ${request.method} ${pathname}`);
  }

  // FIRST - Check for social media bots and allow them through with caching
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const isSocialBot = socialBots.some(bot => userAgent.includes(bot));

  if (isSocialBot) {
    console.log(`[Middleware] Allowing social bot: ${userAgent}`);
    const response = NextResponse.next();
    // Add cache headers for good SEO
    response.headers.set('Cache-Control', 'public, max-age=3600');
    return response;
  }

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // Check if this is a NextAuth callback route
  if (pathname.startsWith("/api/auth/callback") || pathname.startsWith("/auth/callback")) {
    console.log(`[Middleware] Allowing auth callback: ${pathname}`);
    return NextResponse.next();
  }

  // Check if the path is a static asset or starts with specific directories
  if (
    staticAssets.includes(pathname) ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/_next/") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg")
  ) {
    // Add cache headers for static assets
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'public, max-age=86400');
    return response;
  }

  // Check if the route is public or API
  const isPublicRoute = 
    publicRoutes.includes(pathname) || 
    publicRoutes.some(route => pathname.startsWith(route + "/"));
  
  const isApiRoute = 
    apiRoutes.some(route => pathname.startsWith(route));

  if (isPublicRoute || isApiRoute) {
    console.log(`[Middleware] Allowing public/API route: ${pathname}`);
    const response = NextResponse.next();
    
    // Add CORS headers
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }

  // Verify authentication for protected routes
  try {
    const token = await getToken({ req: request });
    
    if (!token) {
      console.log(`[Middleware] No token found, redirecting to login: ${pathname}`);
      
      // Construct login URL with callback
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      
      return NextResponse.redirect(loginUrl);
    }
    
    // Get the response for authenticated routes
    const response = NextResponse.next();
    
    // Add security headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    
    return response;
  } catch (error) {
    console.error("[Middleware] Auth error:", error);
    
    // Redirect to login with error on auth failure
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "AuthError");
    
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    // Apply middleware to all routes except static assets and API routes
    "/((?!_next/static|_next/image).*)",
  ],
};
