/**
 * Production-grade Service Status Types
 * Comprehensive type definitions for AWS service monitoring
 */

/** Service health status levels */
export type ServiceHealthStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance"
  | "unknown";

/** Overall system status */
export type OverallStatus =
  | "all_operational"
  | "degraded_performance"
  | "partial_outage"
  | "major_outage"
  | "maintenance";

/** Service type identifiers matching our CloudFormation stack */
export type ServiceType =
  | "entry-service"
  | "settings-service"
  | "analytics-service"
  | "ai-service"
  | "prompts-service"
  | "gamification-service"
  | "authorizer"
  | "api-gateway"
  | "dynamodb"
  | "eventbridge";

/** AWS Resource types */
export type AWSResourceType =
  | "lambda"
  | "api-gateway"
  | "dynamodb"
  | "eventbridge"
  | "cognito"
  | "cloudwatch";

/** Individual service health check result */
export interface ServiceHealth {
  id: ServiceType;
  name: string;
  description: string;
  status: ServiceHealthStatus;
  latency: number | null;
  lastChecked: string;
  uptime: number;
  uptimeHistory: UptimeDataPoint[];
  errorRate: number;
  requestsPerMinute: number;
  resourceType: AWSResourceType;
  region: string;
  endpoint?: string;
  metadata?: ServiceMetadata;
}

/** Service-specific metadata */
export interface ServiceMetadata {
  functionName?: string;
  memorySize?: number;
  timeout?: number;
  runtime?: string;
  architecture?: string;
  codeSize?: number;
  lastModified?: string;
  version?: string;
  tableName?: string;
  tableStatus?: string;
  itemCount?: number;
  tableSizeBytes?: number;
  eventBusName?: string;
  ruleCount?: number;
}

/** Uptime data point for historical tracking */
export interface UptimeDataPoint {
  timestamp: string;
  status: ServiceHealthStatus;
  latency: number | null;
  success: boolean;
}

/** DynamoDB table status */
export interface DynamoDBTableStatus {
  tableName: string;
  status: "ACTIVE" | "CREATING" | "UPDATING" | "DELETING" | "ARCHIVED";
  itemCount: number;
  sizeBytes: number;
  readCapacity: number | null;
  writeCapacity: number | null;
  billingMode: "PAY_PER_REQUEST" | "PROVISIONED";
  gsiCount: number;
  lsiCount: number;
}

/** API Gateway status */
export interface APIGatewayStatus {
  apiId: string;
  stageName: string;
  status: ServiceHealthStatus;
  latency: number;
  requestCount: number;
  errorCount: number;
  throttledCount: number;
  cacheHitCount: number;
  cacheMissCount: number;
}

/** EventBridge status */
export interface EventBridgeStatus {
  eventBusName: string;
  status: ServiceHealthStatus;
  ruleCount: number;
  eventsPublished: number;
  eventsMatched: number;
  eventsDelivered: number;
  eventsFailed: number;
}

/** AI Service specific metrics */
export interface AIServiceMetrics {
  provider: "anthropic" | "openai" | "local";
  providerStatus: ServiceHealthStatus;
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  averageLatency: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  costEstimate: number;
  modelVersion: string;
}

/** Prompts Service metrics */
export interface PromptsMetrics {
  totalPrompts: number;
  promptsByCategory: Record<string, number>;
  dailyPromptsServed: number;
  randomPromptsServed: number;
  averageResponseTime: number;
}

/** Analytics Service metrics */
export interface AnalyticsMetrics {
  totalEntriesAnalyzed: number;
  moodDistribution: Record<string, number>;
  sentimentTrends: SentimentTrend[];
  peakUsageHours: number[];
  averageEntriesPerUser: number;
}

/** Sentiment trend data */
export interface SentimentTrend {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  average: number;
}

/** Real-time metrics for charts */
export interface RealtimeMetrics {
  timestamp: string;
  requestsPerSecond: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  errorRate: number;
  activeConnections: number;
  cpuUsage: number;
  memoryUsage: number;
}

/** Historical metrics for time-series charts */
export interface HistoricalMetrics {
  period: "1h" | "6h" | "24h" | "7d" | "30d";
  dataPoints: RealtimeMetrics[];
  aggregates: {
    avgLatency: number;
    maxLatency: number;
    minLatency: number;
    totalRequests: number;
    totalErrors: number;
    avgErrorRate: number;
    uptimePercentage: number;
  };
}

/** Incident report */
export interface Incident {
  id: string;
  title: string;
  description: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  severity: "minor" | "major" | "critical";
  affectedServices: ServiceType[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  updates: IncidentUpdate[];
}

/** Incident update */
export interface IncidentUpdate {
  id: string;
  message: string;
  status: Incident["status"];
  createdAt: string;
}

/** Scheduled maintenance */
export interface ScheduledMaintenance {
  id: string;
  title: string;
  description: string;
  affectedServices: ServiceType[];
  scheduledStart: string;
  scheduledEnd: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}

/** Complete system status response */
export interface SystemStatus {
  overall: OverallStatus;
  services: ServiceHealth[];
  dynamoDBTables: DynamoDBTableStatus[];
  apiGateway: APIGatewayStatus | null;
  eventBridge: EventBridgeStatus | null;
  aiMetrics: AIServiceMetrics | null;
  promptsMetrics: PromptsMetrics | null;
  analyticsMetrics: AnalyticsMetrics | null;
  realtimeMetrics: RealtimeMetrics[];
  historicalMetrics: HistoricalMetrics | null;
  incidents: Incident[];
  maintenanceWindows: ScheduledMaintenance[];
  lastUpdated: string;
  nextUpdate: string;
  region: string;
  stage: string;
}

/** Status check request options */
export interface StatusCheckOptions {
  includeMetrics?: boolean;
  includeHistory?: boolean;
  historyPeriod?: HistoricalMetrics["period"];
  services?: ServiceType[];
  forceRefresh?: boolean;
}

/** Status API response */
export interface StatusAPIResponse {
  success: boolean;
  data: SystemStatus | null;
  error?: string;
  cached: boolean;
  cacheAge: number;
}

/** Hook return type */
export interface UseServiceStatusReturn {
  status: SystemStatus | null;
  isLoading: boolean;
  error: Error | null;
  isStale: boolean;
  lastFetched: Date | null;
  refetch: () => Promise<void>;
  overallHealth: OverallStatus;
  serviceCount: {
    operational: number;
    degraded: number;
    outage: number;
    total: number;
  };
}

/** Status indicator props */
export interface StatusIndicatorProps {
  status: ServiceHealthStatus | OverallStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  pulse?: boolean;
  className?: string;
}

/** Service card props */
export interface ServiceCardProps {
  service: ServiceHealth;
  expanded?: boolean;
  onToggle?: () => void;
  showDetails?: boolean;
}

/** Chart data types for Recharts */
export interface ChartDataPoint {
  name: string;
  value: number;
  timestamp?: string;
  color?: string;
}

export interface LatencyChartData {
  timestamp: string;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
}

export interface UptimeChartData {
  date: string;
  uptime: number;
  incidents: number;
}

export interface RequestsChartData {
  timestamp: string;
  requests: number;
  errors: number;
  success: number;
}

/** Status page filter options */
export interface StatusPageFilters {
  serviceTypes: ServiceType[];
  statusFilter: ServiceHealthStatus[];
  timeRange: HistoricalMetrics["period"];
  showMaintenance: boolean;
  showIncidents: boolean;
}
