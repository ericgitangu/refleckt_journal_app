import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { ApiError } from "@/lib/api";
import { createServerComponentClient } from "@/lib/api/server-client";
import { cacheInsights } from "@/lib/offline/insights-cache";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

// Configure cache settings
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get entry ID from params
    const entryId = params.id;
    if (!entryId) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 }
      );
    }

    // Create API client with authentication
    const apiClient = createServerComponentClient(session);
    
    // Make request to backend entry service for insights
    const response = await apiClient.get(
      `/entries/${entryId}/insights`
    );

    // If successful, cache the insights for offline use
    if (response.status === 200) {
      await cacheInsights(entryId, response.data, CACHE_TTL);
    }

    // Return the insights data
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching entry insights:", error);

    // Handle specific error status codes
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: "No insights found for this entry" }, 
          { status: 404 }
        );
      }
      
      if (error.status === 503) {
        // If AI service is down, try to get from cache
        try {
          const cachedInsights = await cacheInsights(params.id);
          if (cachedInsights) {
            return NextResponse.json({
              ...cachedInsights,
              _cached: true,
              _cachedAt: cachedInsights._timestamp,
            });
          }
        } catch (cacheError) {
          console.error("Cache retrieval error:", cacheError);
        }
        
        return NextResponse.json(
          { error: "AI service temporarily unavailable" },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    // Default error response
    return NextResponse.json(
      { error: "Failed to fetch entry insights" },
      { status: 500 }
    );
  }
}

// POST: Trigger on-demand AI insights generation
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get entry ID from params
    const entryId = params.id;
    if (!entryId) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 }
      );
    }

    // Create API client with authentication
    const apiClient = createServerComponentClient(session);

    // Trigger AI insights generation via backend
    // The backend should have an endpoint to generate insights on-demand
    const response = await apiClient.post(
      `/entries/${entryId}/insights/generate`
    );

    // If successful, cache the new insights
    if (response.status === 200 || response.status === 201) {
      await cacheInsights(entryId, response.data, CACHE_TTL);
    }

    // Return the generated insights
    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    console.error("Error generating entry insights:", error);

    // Handle specific error status codes
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: "Entry not found" },
          { status: 404 }
        );
      }

      if (error.status === 503) {
        return NextResponse.json(
          { error: "AI service temporarily unavailable. Please try again later." },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    // Default error response
    return NextResponse.json(
      { error: "Failed to generate entry insights" },
      { status: 500 }
    );
  }
} 