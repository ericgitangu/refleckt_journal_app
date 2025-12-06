"use client";

import React, { useState, useMemo } from "react";
import {
  RefreshCw,
  Server,
  Database,
  Zap,
  Brain,
  MessageSquare,
  BarChart3,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import {
  StatusDot,
  StatusBadge,
} from "@/components/status/StatusIndicator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ServiceHealth,
  ServiceType,
  OverallStatus,
} from "@/types/status";

// Color palette for charts
const CHART_COLORS = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  muted: "#6b7280",
};

const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6366f1", "#3b82f6"];

// Service icons mapping
const SERVICE_ICONS: Record<ServiceType, React.ComponentType<{ className?: string }>> = {
  "entry-service": Server,
  "settings-service": Server,
  "analytics-service": BarChart3,
  "ai-service": Brain,
  "prompts-service": MessageSquare,
  authorizer: Zap,
  "api-gateway": Activity,
  dynamodb: Database,
  eventbridge: Zap,
};

// Status summary component
function StatusSummary({
  overall,
  serviceCount,
  lastUpdated,
  onRefresh,
  isLoading,
}: {
  overall: OverallStatus;
  serviceCount: { operational: number; degraded: number; outage: number; total: number };
  lastUpdated: string | null;
  onRefresh: () => void;
  isLoading: boolean;
}) {
  const statusMessages: Record<OverallStatus, { title: string; subtitle: string }> = {
    all_operational: {
      title: "All Systems Operational",
      subtitle: "All services are running smoothly",
    },
    degraded_performance: {
      title: "Degraded Performance",
      subtitle: "Some services are experiencing issues",
    },
    partial_outage: {
      title: "Partial Outage",
      subtitle: "Some services are unavailable",
    },
    major_outage: {
      title: "Major Outage",
      subtitle: "Multiple services are down",
    },
    maintenance: {
      title: "Under Maintenance",
      subtitle: "Scheduled maintenance in progress",
    },
  };

  const message = statusMessages[overall] || statusMessages.all_operational;

  return (
    <div className="bg-card border rounded-xl p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <StatusDot status={overall} size="lg" showPulse={true} />
          <div>
            <h1 className="text-2xl font-bold">{message.title}</h1>
            <p className="text-muted-foreground">{message.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <div className="flex gap-4">
              <span className="text-emerald-500">{serviceCount.operational} operational</span>
              {serviceCount.degraded > 0 && (
                <span className="text-yellow-500">{serviceCount.degraded} degraded</span>
              )}
              {serviceCount.outage > 0 && (
                <span className="text-red-500">{serviceCount.outage} down</span>
              )}
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                <span>Updated {new Date(lastUpdated).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}

// Service card component
function ServiceCard({
  service,
  expanded,
  onToggle,
}: {
  service: ServiceHealth;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = SERVICE_ICONS[service.id] || Server;

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold">{service.name}</h3>
            <p className="text-sm text-muted-foreground">{service.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={service.status} />
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t bg-muted/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Latency</p>
              <p className="text-lg font-semibold">
                {service.latency ? `${service.latency}ms` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Uptime</p>
              <p className="text-lg font-semibold">{service.uptime.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Error Rate</p>
              <p className="text-lg font-semibold">
                {(service.errorRate * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Requests/min</p>
              <p className="text-lg font-semibold">{service.requestsPerMinute}</p>
            </div>
          </div>

          {service.metadata && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Configuration</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {service.metadata.memorySize && (
                  <div>
                    <span className="text-muted-foreground">Memory:</span>{" "}
                    {service.metadata.memorySize}MB
                  </div>
                )}
                {service.metadata.timeout && (
                  <div>
                    <span className="text-muted-foreground">Timeout:</span>{" "}
                    {service.metadata.timeout}s
                  </div>
                )}
                {service.metadata.architecture && (
                  <div>
                    <span className="text-muted-foreground">Arch:</span>{" "}
                    {service.metadata.architecture}
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Region:</span> {service.region}
                </div>
              </div>
            </div>
          )}

          {/* Mini uptime chart */}
          {service.uptimeHistory && service.uptimeHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">24h Latency Trend</p>
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={service.uptimeHistory}>
                    <Area
                      type="monotone"
                      dataKey="latency"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Latency chart component
function LatencyChart({
  data,
}: {
  data: Array<{ timestamp: string; latencyP50: number; latencyP95: number; latencyP99: number }>;
}) {
  const chartData = useMemo(() => {
    return data.slice(-30).map((d) => ({
      time: new Date(d.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      p50: d.latencyP50,
      p95: d.latencyP95,
      p99: d.latencyP99,
    }));
  }, [data]);

  return (
    <div className="bg-card border rounded-lg p-4">
      <h3 className="font-semibold mb-4">Response Latency (ms)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
            />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="p50"
              name="P50"
              stroke={CHART_COLORS.success}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="p95"
              name="P95"
              stroke={CHART_COLORS.warning}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="p99"
              name="P99"
              stroke={CHART_COLORS.danger}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Request volume chart
function RequestVolumeChart({
  data,
}: {
  data: Array<{ timestamp: string; requestsPerSecond: number; errorRate: number }>;
}) {
  const chartData = useMemo(() => {
    return data.slice(-30).map((d) => ({
      time: new Date(d.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      requests: Math.round(d.requestsPerSecond * 60),
      errors: Math.round(d.requestsPerSecond * 60 * d.errorRate),
    }));
  }, [data]);

  return (
    <div className="bg-card border rounded-lg p-4">
      <h3 className="font-semibold mb-4">Request Volume (per minute)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
            />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar dataKey="requests" name="Requests" fill={CHART_COLORS.primary} />
            <Bar dataKey="errors" name="Errors" fill={CHART_COLORS.danger} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// AI metrics component
function AIMetricsCard({
  metrics,
}: {
  metrics: {
    provider: string;
    totalAnalyses: number;
    successfulAnalyses: number;
    failedAnalyses: number;
    averageLatency: number;
    tokenUsage: { input: number; output: number; total: number };
    costEstimate: number;
    modelVersion: string;
  };
}) {
  const successRate =
    metrics.totalAnalyses > 0
      ? (metrics.successfulAnalyses / metrics.totalAnalyses) * 100
      : 0;

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Service Metrics
        </h3>
        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
          {metrics.provider.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Total Analyses</p>
          <p className="text-2xl font-bold">{metrics.totalAnalyses.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Success Rate</p>
          <p className="text-2xl font-bold text-emerald-500">{successRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg Latency</p>
          <p className="text-2xl font-bold">{metrics.averageLatency}ms</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Est. Cost</p>
          <p className="text-2xl font-bold">${metrics.costEstimate.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-muted-foreground mb-2">Token Usage</p>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Input:</span>{" "}
            {metrics.tokenUsage.input.toLocaleString()}
          </div>
          <div>
            <span className="text-muted-foreground">Output:</span>{" "}
            {metrics.tokenUsage.output.toLocaleString()}
          </div>
          <div>
            <span className="text-muted-foreground">Total:</span>{" "}
            {metrics.tokenUsage.total.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Model: {metrics.modelVersion}
      </div>
    </div>
  );
}

// Prompts metrics component
function PromptsMetricsCard({
  metrics,
}: {
  metrics: {
    totalPrompts: number;
    promptsByCategory: Record<string, number>;
    dailyPromptsServed: number;
    randomPromptsServed: number;
    averageResponseTime: number;
  };
}) {
  const pieData = Object.entries(metrics.promptsByCategory).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Prompts Metrics
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Total Prompts</p>
          <p className="text-2xl font-bold">{metrics.totalPrompts}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Daily Served</p>
          <p className="text-2xl font-bold">{metrics.dailyPromptsServed}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Random Served</p>
          <p className="text-2xl font-bold">{metrics.randomPromptsServed}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg Response</p>
          <p className="text-2xl font-bold">{metrics.averageResponseTime}ms</p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// DynamoDB tables component
function DynamoDBTablesCard({
  tables,
}: {
  tables: Array<{
    tableName: string;
    status: string;
    itemCount: number;
    sizeBytes: number;
  }>;
}) {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-card border rounded-lg p-4">
      <h3 className="font-semibold flex items-center gap-2 mb-4">
        <Database className="h-5 w-5" />
        DynamoDB Tables
      </h3>

      <div className="space-y-3">
        {tables.map((table) => (
          <div
            key={table.tableName}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <StatusDot
                status={table.status === "ACTIVE" ? "operational" : "degraded"}
                size="sm"
              />
              <div>
                <p className="font-medium text-sm">{table.tableName}</p>
                <p className="text-xs text-muted-foreground">
                  {table.itemCount.toLocaleString()} items
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{formatBytes(table.sizeBytes)}</p>
              <p className="text-xs text-muted-foreground">{table.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main status page component
export default function StatusPage() {
  const {
    status,
    isLoading,
    error,
    lastFetched,
    refetch,
    overallHealth,
    serviceCount,
  } = useServiceStatus({
    enablePolling: true,
    pollInterval: 30000,
    includeMetrics: true,
    includeHistory: true,
    historyPeriod: "1h",
  });

  const [expandedServices, setExpandedServices] = useState<Set<ServiceType>>(new Set());

  const toggleService = (id: ServiceType) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (error && !status) {
    return (
      <div className="container py-8 max-w-6xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
            Unable to fetch status
          </h2>
          <p className="text-red-600 dark:text-red-300 mt-2">{error.message}</p>
          <Button onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      {/* Status Summary */}
      <StatusSummary
        overall={overallHealth}
        serviceCount={serviceCount}
        lastUpdated={status?.lastUpdated || null}
        onRefresh={refetch}
        isLoading={isLoading}
      />

      {/* Services Grid */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Services</h2>
        <div className="grid gap-3">
          {status?.services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              expanded={expandedServices.has(service.id)}
              onToggle={() => toggleService(service.id)}
            />
          ))}
        </div>
      </section>

      {/* Charts Section */}
      {status?.realtimeMetrics && status.realtimeMetrics.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Performance Metrics</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <LatencyChart data={status.realtimeMetrics} />
            <RequestVolumeChart data={status.realtimeMetrics} />
          </div>
        </section>
      )}

      {/* AI & Prompts Metrics */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Service Details</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {status?.aiMetrics && <AIMetricsCard metrics={status.aiMetrics} />}
          {status?.promptsMetrics && <PromptsMetricsCard metrics={status.promptsMetrics} />}
        </div>
      </section>

      {/* Infrastructure */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Infrastructure</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {status?.dynamoDBTables && <DynamoDBTablesCard tables={status.dynamoDBTables} />}

          {status?.apiGateway && (
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5" />
                API Gateway
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Stage</p>
                  <p className="text-lg font-bold">{status.apiGateway.stageName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Latency</p>
                  <p className="text-lg font-bold">{status.apiGateway.latency}ms</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requests</p>
                  <p className="text-lg font-bold">{status.apiGateway.requestCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Errors</p>
                  <p className="text-lg font-bold text-red-500">
                    {status.apiGateway.errorCount}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground mt-8 pt-8 border-t">
        <p>
          Region: {status?.region || "us-east-1"} | Stage: {status?.stage || "dev"}
        </p>
        <p className="mt-1">
          Last updated: {status?.lastUpdated ? new Date(status.lastUpdated).toLocaleString() : "N/A"}
        </p>
        <a
          href="https://health.aws.amazon.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
        >
          AWS Service Health Dashboard
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
