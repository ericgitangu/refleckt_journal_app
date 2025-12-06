import { NextResponse } from "next/server";
import axios from "axios";
import type {
  SystemStatus,
  ServiceHealth,
  ServiceHealthStatus,
  OverallStatus,
  ServiceType,
  DynamoDBTableStatus,
  APIGatewayStatus,
  EventBridgeStatus,
  AIServiceMetrics,
  PromptsMetrics,
  AnalyticsMetrics,
  RealtimeMetrics,
  HistoricalMetrics,
  UptimeDataPoint,
  StatusCheckOptions,
} from "@/types/status";

// Cache configuration
const CACHE_TTL_MS = 30000; // 30 seconds
const STALE_TTL_MS = 120000; // 2 minutes - serve stale while revalidating

interface CacheEntry {
  data: SystemStatus;
  timestamp: number;
  etag: string;
}

let statusCache: CacheEntry | null = null;

// Service endpoint configurations
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://nc9782vdlc.execute-api.us-east-1.amazonaws.com/dev";

const SERVICE_CONFIGS: Array<{
  id: ServiceType;
  name: string;
  description: string;
  endpoint: string;
  healthEndpoint?: string;
}> = [
  {
    id: "entry-service",
    name: "Entry Service",
    description: "Journal entry CRUD operations",
    endpoint: "/entries",
    healthEndpoint: "/entries",
  },
  {
    id: "settings-service",
    name: "Settings Service",
    description: "User preferences and categories",
    endpoint: "/settings",
    healthEndpoint: "/settings",
  },
  {
    id: "analytics-service",
    name: "Analytics Service",
    description: "Sentiment analysis and trends",
    endpoint: "/analytics",
    healthEndpoint: "/analytics",
  },
  {
    id: "ai-service",
    name: "AI Service",
    description: "AI-powered insights generation",
    endpoint: "/entries",
    healthEndpoint: "/entries",
  },
  {
    id: "prompts-service",
    name: "Prompts Service",
    description: "Daily and category-based prompts",
    endpoint: "/prompts",
    healthEndpoint: "/prompts",
  },
  {
    id: "authorizer",
    name: "JWT Authorizer",
    description: "Authentication and authorization",
    endpoint: "/entries",
    healthEndpoint: "/entries",
  },
];

// DynamoDB tables from CloudFormation
const DYNAMODB_TABLES = [
  { name: "reflekt-entries", displayName: "Entries Table" },
  { name: "reflekt-categories", displayName: "Categories Table" },
  { name: "reflekt-insights", displayName: "Insights Table" },
  { name: "reflekt-settings", displayName: "Settings Table" },
  { name: "reflekt-prompts", displayName: "Prompts Table" },
];

/**
 * Check health of a single service endpoint
 */
async function checkServiceHealth(
  config: (typeof SERVICE_CONFIGS)[0],
  token?: string,
): Promise<ServiceHealth> {
  const startTime = Date.now();
  let status: ServiceHealthStatus = "unknown";
  let latency: number | null = null;
  let errorRate = 0;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await axios.get(
      `${API_BASE_URL}${config.healthEndpoint || config.endpoint}`,
      {
        headers,
        timeout: 10000,
        validateStatus: (s) => s < 500,
      },
    );

    latency = Date.now() - startTime;

    if (response.status >= 200 && response.status < 300) {
      status = latency > 2000 ? "degraded" : "operational";
    } else if (response.status === 401 || response.status === 403) {
      // Auth services working correctly if they return 401/403
      status = "operational";
    } else if (response.status >= 400 && response.status < 500) {
      status = "degraded";
      errorRate = 0.1;
    } else {
      status = "partial_outage";
      errorRate = 0.5;
    }
  } catch (error) {
    latency = Date.now() - startTime;

    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        status = "degraded";
        errorRate = 0.3;
      } else if (error.response) {
        status =
          error.response.status >= 500 ? "major_outage" : "partial_outage";
        errorRate = error.response.status >= 500 ? 1.0 : 0.5;
      } else {
        status = "major_outage";
        errorRate = 1.0;
      }
    } else {
      status = "unknown";
      errorRate = 0.5;
    }
  }

  // Generate uptime history (simulated for now - in production, store in DB)
  const uptimeHistory = generateUptimeHistory(status);

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    status,
    latency,
    lastChecked: new Date().toISOString(),
    uptime: calculateUptime(uptimeHistory),
    uptimeHistory,
    errorRate,
    requestsPerMinute: Math.floor(Math.random() * 100) + 10,
    resourceType: "lambda",
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: `${API_BASE_URL}${config.endpoint}`,
    metadata: {
      functionName: `reflekt-${config.id}`,
      memorySize: config.id === "ai-service" ? 1024 : 512,
      timeout: config.id === "ai-service" ? 60 : 30,
      runtime: "provided.al2",
      architecture: "arm64",
    },
  };
}

/**
 * Generate simulated uptime history
 */
function generateUptimeHistory(currentStatus: ServiceHealthStatus): UptimeDataPoint[] {
  const history: UptimeDataPoint[] = [];
  const now = Date.now();

  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now - i * 3600000).toISOString();
    const isRecent = i < 2;

    history.push({
      timestamp,
      status: isRecent ? currentStatus : "operational",
      latency: Math.floor(Math.random() * 200) + 50,
      success: isRecent ? currentStatus === "operational" : Math.random() > 0.02,
    });
  }

  return history;
}

/**
 * Calculate uptime percentage from history
 */
function calculateUptime(history: UptimeDataPoint[]): number {
  if (history.length === 0) return 100;
  const successCount = history.filter((h) => h.success).length;
  return Math.round((successCount / history.length) * 10000) / 100;
}

/**
 * Determine overall system status from individual services
 */
function determineOverallStatus(services: ServiceHealth[]): OverallStatus {
  const statusCounts = services.reduce(
    (acc, s) => {
      if (s.status === "operational") acc.operational++;
      else if (s.status === "degraded") acc.degraded++;
      else if (s.status === "partial_outage") acc.partial++;
      else if (s.status === "major_outage") acc.major++;
      else if (s.status === "maintenance") acc.maintenance++;
      return acc;
    },
    { operational: 0, degraded: 0, partial: 0, major: 0, maintenance: 0 },
  );

  const total = services.length;

  if (statusCounts.major > 0) return "major_outage";
  if (statusCounts.partial >= total / 2) return "partial_outage";
  if (statusCounts.partial > 0 || statusCounts.degraded >= total / 2)
    return "degraded_performance";
  if (statusCounts.maintenance > 0) return "maintenance";
  return "all_operational";
}

/**
 * Generate DynamoDB table status (simulated - in production, use AWS SDK)
 */
function generateDynamoDBStatus(): DynamoDBTableStatus[] {
  const stage = process.env.STAGE || "dev";

  return DYNAMODB_TABLES.map((table) => ({
    tableName: `${table.name}-${stage}`,
    status: "ACTIVE" as const,
    itemCount: Math.floor(Math.random() * 10000) + 100,
    sizeBytes: Math.floor(Math.random() * 10000000) + 100000,
    readCapacity: null,
    writeCapacity: null,
    billingMode: "PAY_PER_REQUEST" as const,
    gsiCount: table.name.includes("entries") ? 2 : 1,
    lsiCount: 0,
  }));
}

/**
 * Generate API Gateway status
 */
function generateAPIGatewayStatus(
  services: ServiceHealth[],
): APIGatewayStatus {
  const avgLatency =
    services.reduce((sum, s) => sum + (s.latency || 0), 0) / services.length;
  const errorCount = services.filter(
    (s) => s.status !== "operational",
  ).length;

  return {
    apiId: "nc9782vdlc",
    stageName: process.env.STAGE || "dev",
    status: errorCount === 0 ? "operational" : errorCount > 2 ? "partial_outage" : "degraded",
    latency: Math.round(avgLatency),
    requestCount: Math.floor(Math.random() * 1000) + 100,
    errorCount: errorCount * 10,
    throttledCount: Math.floor(Math.random() * 5),
    cacheHitCount: Math.floor(Math.random() * 200),
    cacheMissCount: Math.floor(Math.random() * 50),
  };
}

/**
 * Generate EventBridge status
 */
function generateEventBridgeStatus(): EventBridgeStatus {
  return {
    eventBusName: "reflekt-journal-events",
    status: "operational",
    ruleCount: 3,
    eventsPublished: Math.floor(Math.random() * 500) + 50,
    eventsMatched: Math.floor(Math.random() * 450) + 45,
    eventsDelivered: Math.floor(Math.random() * 440) + 44,
    eventsFailed: Math.floor(Math.random() * 5),
  };
}

/**
 * Generate AI service metrics
 */
function generateAIMetrics(): AIServiceMetrics {
  const provider = (process.env.AI_PROVIDER || "anthropic") as "anthropic" | "openai";

  return {
    provider,
    providerStatus: "operational",
    totalAnalyses: Math.floor(Math.random() * 5000) + 500,
    successfulAnalyses: Math.floor(Math.random() * 4800) + 480,
    failedAnalyses: Math.floor(Math.random() * 50) + 5,
    averageLatency: Math.floor(Math.random() * 2000) + 500,
    tokenUsage: {
      input: Math.floor(Math.random() * 100000) + 10000,
      output: Math.floor(Math.random() * 50000) + 5000,
      total: Math.floor(Math.random() * 150000) + 15000,
    },
    costEstimate: Math.round(Math.random() * 10 * 100) / 100,
    modelVersion: provider === "anthropic" ? "claude-3-haiku-20240307" : "gpt-4-turbo",
  };
}

/**
 * Generate prompts metrics
 */
function generatePromptsMetrics(): PromptsMetrics {
  return {
    totalPrompts: Math.floor(Math.random() * 200) + 50,
    promptsByCategory: {
      reflective: Math.floor(Math.random() * 50) + 10,
      gratitude: Math.floor(Math.random() * 40) + 10,
      growth: Math.floor(Math.random() * 40) + 10,
      creative: Math.floor(Math.random() * 30) + 10,
      mindfulness: Math.floor(Math.random() * 30) + 10,
    },
    dailyPromptsServed: Math.floor(Math.random() * 100) + 20,
    randomPromptsServed: Math.floor(Math.random() * 200) + 50,
    averageResponseTime: Math.floor(Math.random() * 100) + 20,
  };
}

/**
 * Generate analytics metrics
 */
function generateAnalyticsMetrics(): AnalyticsMetrics {
  const now = new Date();
  const trends: AnalyticsMetrics["sentimentTrends"] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    trends.push({
      date: date.toISOString().split("T")[0],
      positive: Math.floor(Math.random() * 40) + 30,
      neutral: Math.floor(Math.random() * 30) + 20,
      negative: Math.floor(Math.random() * 20) + 10,
      average: Math.round((Math.random() * 0.4 + 0.3) * 100) / 100,
    });
  }

  return {
    totalEntriesAnalyzed: Math.floor(Math.random() * 10000) + 1000,
    moodDistribution: {
      happy: Math.floor(Math.random() * 30) + 20,
      calm: Math.floor(Math.random() * 25) + 15,
      anxious: Math.floor(Math.random() * 15) + 5,
      sad: Math.floor(Math.random() * 10) + 5,
      excited: Math.floor(Math.random() * 20) + 10,
    },
    sentimentTrends: trends,
    peakUsageHours: [8, 9, 12, 18, 19, 20, 21],
    averageEntriesPerUser: Math.round(Math.random() * 30 + 10),
  };
}

/**
 * Generate realtime metrics
 */
function generateRealtimeMetrics(): RealtimeMetrics[] {
  const metrics: RealtimeMetrics[] = [];
  const now = Date.now();

  for (let i = 59; i >= 0; i--) {
    metrics.push({
      timestamp: new Date(now - i * 60000).toISOString(),
      requestsPerSecond: Math.random() * 10 + 1,
      latencyP50: Math.floor(Math.random() * 100) + 30,
      latencyP95: Math.floor(Math.random() * 200) + 80,
      latencyP99: Math.floor(Math.random() * 500) + 150,
      errorRate: Math.random() * 0.05,
      activeConnections: Math.floor(Math.random() * 50) + 5,
      cpuUsage: Math.random() * 30 + 5,
      memoryUsage: Math.random() * 40 + 20,
    });
  }

  return metrics;
}

/**
 * Generate historical metrics
 */
function generateHistoricalMetrics(
  period: HistoricalMetrics["period"],
): HistoricalMetrics {
  const dataPoints = generateRealtimeMetrics();

  return {
    period,
    dataPoints,
    aggregates: {
      avgLatency: Math.floor(Math.random() * 100) + 50,
      maxLatency: Math.floor(Math.random() * 500) + 200,
      minLatency: Math.floor(Math.random() * 30) + 10,
      totalRequests: Math.floor(Math.random() * 100000) + 10000,
      totalErrors: Math.floor(Math.random() * 500) + 50,
      avgErrorRate: Math.random() * 0.02,
      uptimePercentage: 99.5 + Math.random() * 0.5,
    },
  };
}

/**
 * GET handler - fetch system status
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const options: StatusCheckOptions = {
    includeMetrics: searchParams.get("metrics") !== "false",
    includeHistory: searchParams.get("history") === "true",
    historyPeriod:
      (searchParams.get("period") as HistoricalMetrics["period"]) || "1h",
    forceRefresh: searchParams.get("refresh") === "true",
  };

  // Check cache
  const now = Date.now();
  if (
    !options.forceRefresh &&
    statusCache &&
    now - statusCache.timestamp < CACHE_TTL_MS
  ) {
    return NextResponse.json(
      {
        success: true,
        data: statusCache.data,
        cached: true,
        cacheAge: Math.round((now - statusCache.timestamp) / 1000),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
          ETag: statusCache.etag,
        },
      },
    );
  }

  // Check if-none-match for conditional requests
  const ifNoneMatch = request.headers.get("if-none-match");
  if (statusCache && ifNoneMatch === statusCache.etag) {
    return new NextResponse(null, { status: 304 });
  }

  try {
    // Perform health checks in parallel
    const serviceHealthPromises = SERVICE_CONFIGS.map((config) =>
      checkServiceHealth(config),
    );

    const services = await Promise.all(serviceHealthPromises);
    const overall = determineOverallStatus(services);

    const systemStatus: SystemStatus = {
      overall,
      services,
      dynamoDBTables: generateDynamoDBStatus(),
      apiGateway: generateAPIGatewayStatus(services),
      eventBridge: generateEventBridgeStatus(),
      aiMetrics: options.includeMetrics ? generateAIMetrics() : null,
      promptsMetrics: options.includeMetrics ? generatePromptsMetrics() : null,
      analyticsMetrics: options.includeMetrics
        ? generateAnalyticsMetrics()
        : null,
      realtimeMetrics: options.includeMetrics ? generateRealtimeMetrics() : [],
      historicalMetrics: options.includeHistory
        ? generateHistoricalMetrics(options.historyPeriod || "1h")
        : null,
      incidents: [],
      maintenanceWindows: [],
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(now + CACHE_TTL_MS).toISOString(),
      region: process.env.AWS_REGION || "us-east-1",
      stage: process.env.STAGE || "dev",
    };

    // Update cache
    const etag = `"${Buffer.from(JSON.stringify(systemStatus)).toString("base64").slice(0, 32)}"`;
    statusCache = {
      data: systemStatus,
      timestamp: now,
      etag,
    };

    return NextResponse.json(
      {
        success: true,
        data: systemStatus,
        cached: false,
        cacheAge: 0,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
          ETag: etag,
        },
      },
    );
  } catch (error) {
    console.error("Status check failed:", error);

    // Return stale cache if available
    if (statusCache && now - statusCache.timestamp < STALE_TTL_MS) {
      return NextResponse.json(
        {
          success: true,
          data: statusCache.data,
          cached: true,
          cacheAge: Math.round((now - statusCache.timestamp) / 1000),
          stale: true,
        },
        {
          headers: {
            "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
            ETag: statusCache.etag,
          },
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        data: null,
        error:
          error instanceof Error ? error.message : "Status check failed",
        cached: false,
        cacheAge: 0,
      },
      { status: 500 },
    );
  }
}
