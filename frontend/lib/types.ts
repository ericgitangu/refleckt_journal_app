/**
 * API Response Types
 */

export interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency: number;
  message?: string;
}

export interface HealthCheckResponse {
  timestamp: string;
  status: "healthy" | "degraded" | "unhealthy";
  services: ServiceStatus[];
}
