import { NextRequest, NextResponse } from "next/server";

/**
 * API route for handling NextAuth errors
 * This endpoint can be used for programmatic error handling or redirects
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const errorCode = searchParams.get("error") || "unknown";

  // Error messages for different NextAuth error codes
  const errorMessages: Record<string, string> = {
    Configuration: "Server configuration error",
    AccessDenied: "Access denied",
    Verification: "Verification link expired or already used",
    OAuthSignin: "OAuth sign-in error",
    OAuthCallback: "OAuth callback error",
    OAuthCreateAccount: "OAuth account creation error",
    OAuthAccountNotLinked: "OAuth account not linked",
    EmailCreateAccount: "Email account creation error",
    Callback: "Authentication callback error",
    OAuthSignInError: "OAuth sign-in error",
    SessionRequired: "Session required",
    Default: "An authentication error occurred",
  };

  const errorMessage = errorMessages[errorCode] || errorMessages.Default;

  // Determine if this is an API request based on Accept header
  const acceptHeader = request.headers.get("accept") || "";
  // Browser requests typically prioritize HTML, API requests are more specific
  const isBrowserRequest =
    acceptHeader.includes("text/html") &&
    !request.headers.has("x-requested-with");

  if (isBrowserRequest) {
    // Redirect to error page for browser requests
    return NextResponse.redirect(
      new URL(`/auth/error?error=${errorCode}`, request.url),
    );
  } else {
    // Return JSON error for API requests
    return NextResponse.json(
      {
        error: true,
        code: errorCode,
        message: errorMessage,
      },
      { status: 401 },
    );
  }
}

export async function POST(request: NextRequest) {
  // Handle POST requests the same way as GET
  return GET(request);
}
