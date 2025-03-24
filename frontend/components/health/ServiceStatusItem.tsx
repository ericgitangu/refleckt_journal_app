"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ServiceStatus } from "@/lib/types";

interface ServiceStatusItemProps {
  service: ServiceStatus;
}

export function ServiceStatusItem({ service }: ServiceStatusItemProps) {
  return (
    <Card
      className="border-l-4 border-l-transparent"
      style={{
        borderLeftColor:
          service.status === "healthy"
            ? "rgb(34, 197, 94)"
            : service.status === "degraded"
              ? "rgb(234, 179, 8)"
              : "rgb(239, 68, 68)",
      }}
    >
      <CardContent className="p-4 flex justify-between items-center">
        <div>
          <div className="font-medium">{service.name}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {service.message ||
              (service.status === "healthy"
                ? "Service is responding normally"
                : service.status === "degraded"
                  ? "Service is responding slowly"
                  : "Service is not responding")}
          </div>
        </div>
        <div className="text-right">
          <div
            className={`font-medium ${
              service.status === "healthy"
                ? "text-green-500"
                : service.status === "degraded"
                  ? "text-yellow-500"
                  : "text-red-500"
            }`}
          >
            {service.status === "healthy"
              ? "Healthy"
              : service.status === "degraded"
                ? "Degraded"
                : "Unhealthy"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {service.latency}ms
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
