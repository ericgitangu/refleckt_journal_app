import { NextResponse } from "next/server";
import axios from "axios";
import { apiRequest } from "@/lib/api-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export async function GET(
  request: Request,
  { params }: { params: { service: string } },
) {
  const { service } = params;

  // Validate service
  const validServices = ["entry", "settings", "analytics", "ai"];

  // If service isn't valid, return 404
  if (!validServices.includes(service)) {
    return NextResponse.json(
      { error: `Service '${service}' not found` },
      { status: 404 },
    );
  }

  // Get service endpoint
  const serviceEndpoint = `/${service}`;

  try {
    const start = Date.now();

    // Use our apiRequest but with requireAuth: false for health check
    await apiRequest(serviceEndpoint, "GET", undefined, { requireAuth: false });

    const latency = Date.now() - start;

    return NextResponse.json({
      name: `${service}-service`,
      status: "healthy",
      latency,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const start = Date.now();
    const latency = Date.now() - start;

    if (axios.isAxiosError(error)) {
      // If we get a 401, that's actually good - it means the service is up
      // but requires authentication
      if (error.response?.status === 401) {
        return NextResponse.json({
          name: `${service}-service`,
          status: "healthy",
          latency,
          message: "Service requires authentication",
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        name: `${service}-service`,
        status: "degraded",
        latency,
        message: `Service returned ${error.response?.status} status code`,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      name: `${service}-service`,
      status: "unhealthy",
      latency,
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
