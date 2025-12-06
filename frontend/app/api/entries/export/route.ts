import { NextResponse } from "next/server";
import { apiRequest, handleApiError } from "@/lib/api-utils";
import { getAuthSession } from "@/lib/auth-utils";

// Add this to make the route explicitly dynamic
export const dynamic = "force-dynamic";

// GET: Export entries in various formats
export async function GET(request: Request) {
  try {
    // Get authentication session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get format from query params (default: json)
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    // Validate format
    const validFormats = ["json", "markdown", "md", "pdf"];
    if (!validFormats.includes(format.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid format. Supported formats: json, markdown, pdf" },
        { status: 400 },
      );
    }

    // Forward request to backend API
    const response = await apiRequest(
      `/entries/export?format=${encodeURIComponent(format)}`,
    );

    // Get content type and filename from backend response
    const contentType =
      response.headers["content-type"] || "application/octet-stream";
    const contentDisposition = response.headers["content-disposition"];

    // Create response with appropriate headers
    const nextResponse = new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(contentDisposition && {
          "Content-Disposition": contentDisposition,
        }),
      },
    });

    return nextResponse;
  } catch (error) {
    return handleApiError(error, "Failed to export entries");
  }
}
