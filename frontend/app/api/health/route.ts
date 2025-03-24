import { NextResponse } from "next/server";
import axios from "axios";
import { apiRequest } from "@/lib/api-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface ServiceCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency: number;
  message?: string;
}

interface HealthResponse {
  timestamp: string;
  status: "healthy" | "degraded" | "unhealthy";
  services: ServiceCheck[];
}

export async function GET() {
  // First try the backend's unified health endpoint
  try {
    const startTime = Date.now();
    const response = await apiRequest("/health", "GET", undefined, {
      requireAuth: false,
    });

    // If we reach here, the backend health endpoint worked
    const backendHealth = response.data as HealthResponse;

    return NextResponse.json({
      ...backendHealth,
      frontend_latency: Date.now() - startTime,
    });
  } catch (error) {
    console.warn(
      "Backend health endpoint failed, falling back to service checks",
    );
    // Fall back to individual service checks
  }

  // If the backend health endpoint failed, check individual services
  const services = [
    "entry-service",
    "settings-service",
    "analytics-service",
    "ai-service",
  ];

  const results: ServiceCheck[] = [];

  // Health check doesn't require authentication for initial probing
  for (const service of services) {
    const start = Date.now();
    try {
      const serviceEndpoint = `/${service.replace("-service", "")}`;

      // Use our apiRequest but with requireAuth: false
      await apiRequest(serviceEndpoint, "GET", undefined, {
        requireAuth: false,
      });

      const latency = Date.now() - start;

      results.push({
        name: service,
        status: "healthy",
        latency,
      });
    } catch (error) {
      const latency = Date.now() - start;

      if (axios.isAxiosError(error)) {
        // If we get a 401, that's actually good - it means the service is up
        // but requires authentication
        if (error.response?.status === 401) {
          results.push({
            name: service,
            status: "healthy",
            latency,
            message: "Service requires authentication",
          });
        } else {
          results.push({
            name: service,
            status: "degraded",
            latency,
            message: `Service returned ${error.response?.status} status code`,
          });
        }
      } else {
        results.push({
          name: service,
          status: "unhealthy",
          latency,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  // Check connectivity to the backend API itself
  results.push({
    name: "backend-api",
    status: API_URL ? "degraded" : "unhealthy",
    latency: 0,
    message: API_URL
      ? "Backend API connection issue"
      : "Backend API URL not configured",
  });

  // Calculate overall status
  const hasUnhealthy = results.some((r) => r.status === "unhealthy");
  const hasDegraded = results.some((r) => r.status === "degraded");

  const overallStatus = hasUnhealthy
    ? "unhealthy"
    : hasDegraded
      ? "degraded"
      : "healthy";

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    status: overallStatus,
    services: results,
  });
}
