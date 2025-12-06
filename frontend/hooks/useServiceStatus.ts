import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import type { AxiosError } from "axios";
import type {
  SystemStatus,
  OverallStatus,
  UseServiceStatusReturn,
  StatusCheckOptions,
  StatusAPIResponse,
} from "@/types/status";

// Configuration
const POLL_INTERVAL_MS = 30000; // 30 seconds
const STALE_THRESHOLD_MS = 60000; // 1 minute
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// Local storage keys for offline support
const CACHE_KEY = "reflekt_service_status";
const CACHE_TIMESTAMP_KEY = "reflekt_service_status_timestamp";

interface UseServiceStatusOptions {
  /** Enable automatic polling */
  enablePolling?: boolean;
  /** Custom poll interval in milliseconds */
  pollInterval?: number;
  /** Include detailed metrics */
  includeMetrics?: boolean;
  /** Include historical data */
  includeHistory?: boolean;
  /** Historical period */
  historyPeriod?: "1h" | "6h" | "24h" | "7d" | "30d";
  /** Callback when status changes */
  onStatusChange?: (status: SystemStatus) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Production-grade hook for monitoring AWS service status
 * Features: polling, caching, offline support, error handling, retries
 */
export function useServiceStatus(
  options: UseServiceStatusOptions = {},
): UseServiceStatusReturn {
  const {
    enablePolling = true,
    pollInterval = POLL_INTERVAL_MS,
    includeMetrics = true,
    includeHistory = false,
    historyPeriod = "1h",
    onStatusChange,
    onError,
  } = options;

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const retryCountRef = useRef(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousStatusRef = useRef<OverallStatus | null>(null);

  /**
   * Load cached status from localStorage
   */
  const loadCachedStatus = useCallback((): SystemStatus | null => {
    if (typeof window === "undefined") return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cached && timestamp) {
        const parsedTimestamp = parseInt(timestamp, 10);
        const age = Date.now() - parsedTimestamp;

        // Only use cache if not too old
        if (age < STALE_THRESHOLD_MS * 5) {
          return JSON.parse(cached);
        }
      }
    } catch {
      console.warn("Failed to load cached status");
    }

    return null;
  }, []);

  /**
   * Save status to localStorage for offline support
   */
  const saveCachedStatus = useCallback((statusData: SystemStatus) => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(statusData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch {
      console.warn("Failed to cache status");
    }
  }, []);

  /**
   * Fetch status from API with retry logic
   */
  const fetchStatus = useCallback(
    async (forceRefresh = false): Promise<SystemStatus | null> => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const params = new URLSearchParams();
      params.set("metrics", includeMetrics.toString());
      params.set("history", includeHistory.toString());
      params.set("period", historyPeriod);
      if (forceRefresh) {
        params.set("refresh", "true");
      }

      try {
        const response = await axios.get<StatusAPIResponse>(
          `/api/status?${params.toString()}`,
          {
            signal: abortControllerRef.current.signal,
            timeout: 15000,
          },
        );

        if (response.data.success && response.data.data) {
          retryCountRef.current = 0;
          return response.data.data;
        }

        throw new Error(response.data.error || "Failed to fetch status");
      } catch (err) {
        // Check if request was aborted
        if (err instanceof Error && err.name === "CanceledError") {
          return null;
        }

        const axiosError = err as AxiosError;

        // Retry logic
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          console.warn(
            `Status fetch failed, retrying (${retryCountRef.current}/${MAX_RETRIES})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          return fetchStatus(forceRefresh);
        }

        throw axiosError;
      }
    },
    [includeMetrics, includeHistory, historyPeriod],
  );

  /**
   * Main refetch function exposed to consumers
   */
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newStatus = await fetchStatus(true);

      if (newStatus) {
        setStatus(newStatus);
        setLastFetched(new Date());
        saveCachedStatus(newStatus);

        // Trigger callback if status changed
        if (
          previousStatusRef.current &&
          previousStatusRef.current !== newStatus.overall
        ) {
          onStatusChange?.(newStatus);
        }
        previousStatusRef.current = newStatus.overall;
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to fetch status");
      setError(error);
      onError?.(error);

      // Fall back to cached data
      const cached = loadCachedStatus();
      if (cached) {
        setStatus(cached);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus, saveCachedStatus, loadCachedStatus, onStatusChange, onError]);

  /**
   * Calculate if data is stale
   */
  const isStale = useCallback((): boolean => {
    if (!lastFetched) return true;
    return Date.now() - lastFetched.getTime() > STALE_THRESHOLD_MS;
  }, [lastFetched]);

  /**
   * Calculate service counts
   */
  const serviceCount = useCallback(() => {
    if (!status?.services) {
      return { operational: 0, degraded: 0, outage: 0, total: 0 };
    }

    return status.services.reduce(
      (acc, service) => {
        acc.total++;
        if (service.status === "operational") {
          acc.operational++;
        } else if (
          service.status === "degraded" ||
          service.status === "maintenance"
        ) {
          acc.degraded++;
        } else {
          acc.outage++;
        }
        return acc;
      },
      { operational: 0, degraded: 0, outage: 0, total: 0 },
    );
  }, [status]);

  // Initial load
  useEffect(() => {
    // Load cached data immediately for better UX
    const cached = loadCachedStatus();
    if (cached) {
      setStatus(cached);
      previousStatusRef.current = cached.overall;
    }

    // Then fetch fresh data
    refetch();
  }, []);

  // Set up polling
  useEffect(() => {
    if (!enablePolling) return;

    pollIntervalRef.current = setInterval(() => {
      refetch();
    }, pollInterval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [enablePolling, pollInterval, refetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Visibility change handler - refetch when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isStale()) {
        refetch();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetch, isStale]);

  // Online/offline handler
  useEffect(() => {
    const handleOnline = () => {
      console.info("Connection restored, refreshing status...");
      refetch();
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [refetch]);

  return {
    status,
    isLoading,
    error,
    isStale: isStale(),
    lastFetched,
    refetch,
    overallHealth: status?.overall || "unknown" as OverallStatus,
    serviceCount: serviceCount(),
  };
}

/**
 * Lightweight hook for just the overall status indicator
 * Optimized for footer/header display
 */
export function useOverallStatus(): {
  status: OverallStatus;
  isLoading: boolean;
  lastChecked: string | null;
} {
  const { status, isLoading } = useServiceStatus({
    enablePolling: true,
    pollInterval: 60000, // Longer interval for lightweight use
    includeMetrics: false,
    includeHistory: false,
  });

  return {
    status: status?.overall || ("unknown" as OverallStatus),
    isLoading,
    lastChecked: status?.lastUpdated || null,
  };
}
