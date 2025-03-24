import { healthApi } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServiceStatus } from "@/lib/types";

interface ServiceDebugMonitorProps {
  serviceName: string;
}

async function fetchServiceDebugInfo(
  serviceName: string,
): Promise<ServiceStatus> {
  try {
    // Extract service name without -service suffix for API call
    const service = serviceName.replace("-service", "");
    const response = await healthApi.checkService(service);

    // Return just the service info from the response
    return {
      name: response.services?.[0]?.name || serviceName,
      status: response.services?.[0]?.status || "unhealthy",
      latency: response.services?.[0]?.latency || 0,
      message: response.services?.[0]?.message,
    };
  } catch (error) {
    console.error(`Error fetching debug info for ${serviceName}:`, error);
    return {
      name: serviceName,
      status: "unhealthy",
      latency: 0,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function ServiceDebugMonitor({
  serviceName,
}: ServiceDebugMonitorProps) {
  const serviceStatus = await fetchServiceDebugInfo(serviceName);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>{serviceName}</CardTitle>
            <Badge
              variant={
                serviceStatus.status === "healthy"
                  ? "default"
                  : serviceStatus.status === "degraded"
                    ? "secondary"
                    : "destructive"
              }
            >
              {serviceStatus.status}
            </Badge>
          </div>
          <CardDescription>
            Response time: {serviceStatus.latency}ms
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serviceStatus.message && (
            <div
              className={`p-4 mb-4 rounded-md border ${
                serviceStatus.status === "healthy"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : serviceStatus.status === "degraded"
                    ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                    : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <div className="font-medium">Status</div>
              <div className="mt-1 text-sm">{serviceStatus.message}</div>
            </div>
          )}

          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Service Endpoints:</h3>
            <div className="text-sm text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                {serviceName === "entry-service" && (
                  <>
                    <li>GET /entries</li>
                    <li>GET /entries/:id</li>
                    <li>POST /entries</li>
                    <li>PUT /entries/:id</li>
                    <li>DELETE /entries/:id</li>
                    <li>GET /entries/search</li>
                  </>
                )}
                {serviceName === "settings-service" && (
                  <>
                    <li>GET /settings</li>
                    <li>PUT /settings</li>
                    <li>GET /settings/categories</li>
                    <li>POST /settings/categories</li>
                    <li>PUT /settings/categories/:id</li>
                    <li>DELETE /settings/categories/:id</li>
                  </>
                )}
                {serviceName === "analytics-service" && (
                  <>
                    <li>GET /analytics</li>
                    <li>POST /analytics</li>
                    <li>GET /analytics/mood</li>
                  </>
                )}
                {serviceName === "ai-service" && (
                  <>
                    <li>Event listener: EntryCreated</li>
                    <li>Event listener: EntryUpdated</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
