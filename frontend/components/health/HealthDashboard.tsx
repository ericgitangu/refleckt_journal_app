"use client";

import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { healthApi } from "@/lib/api";
import { ServiceStatusItem } from "./ServiceStatusItem";
import { ServiceStatusSkeleton } from "./HealthStatusSkeleton";
import { HealthCheckResponse } from "@/lib/types";

async function fetchHealthData(): Promise<HealthCheckResponse> {
  try {
    // Call the health API endpoint which uses the backend health check
    return await healthApi.checkServices();
  } catch (error) {
    console.error("Error fetching health data:", error);
    return {
      timestamp: new Date().toISOString(),
      status: "unhealthy",
      services: [],
    };
  }
}

export async function HealthDashboard() {
  const healthData = await fetchHealthData();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center">
            <div className="relative mr-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  healthData.status === "healthy"
                    ? "bg-green-500"
                    : healthData.status === "degraded"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              ></div>
              {(healthData.status === "healthy" ||
                healthData.status === "degraded") && (
                <div
                  className={`absolute -inset-1 rounded-full ${
                    healthData.status === "healthy"
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  } opacity-30 animate-ping`}
                />
              )}
            </div>
            System Status:{" "}
            {healthData.status === "healthy"
              ? "Healthy"
              : healthData.status === "degraded"
                ? "Degraded"
                : "Unhealthy"}
          </CardTitle>
          <CardDescription>
            Last updated: {new Date(healthData.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            {healthData.status === "healthy"
              ? "All systems operational"
              : healthData.status === "degraded"
                ? "Some services are experiencing issues"
                : "System is experiencing major issues"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service Health</CardTitle>
          <CardDescription>
            Status and response times of backend services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {healthData.services?.map((service) => (
              <Suspense key={service.name} fallback={<ServiceStatusSkeleton />}>
                <ServiceStatusItem service={service} />
              </Suspense>
            ))}
            {(!healthData.services || healthData.services.length === 0) && (
              <div className="text-muted-foreground text-center py-4">
                No service data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
