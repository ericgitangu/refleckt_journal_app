// Force dynamic rendering to avoid static generation issues
export const dynamic = "force-dynamic";

// Set Edge runtime for best performance with OG images
export const runtime = "edge";

// Add proper cache control for social media crawlers
export async function GET(request: Request) {
  // Redirect to the static image instead of generating one
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/og-image.jpg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
