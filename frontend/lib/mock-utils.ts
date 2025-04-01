/**
 * Utility functions for mock data handling
 */

/**
 * Check if mock data should be used based on environment variable
 */
export function shouldUseMockData(): boolean {
  // Default to true in development and false in production
  const defaultValue = process.env.NODE_ENV === "development";

  // Use environment variable if set
  const envValue = process.env.NEXT_PUBLIC_USE_MOCK_DATA;

  // If env var is set, parse it as boolean
  if (envValue !== undefined) {
    return envValue === "true";
  }

  return defaultValue;
}

/**
 * Interface for backend service methods that can fall back to mock data
 */
export interface WithMockFallback<T> {
  useMock: boolean;
  mockData: T;
  fetch: () => Promise<T>;
}

/**
 * Fetch data from backend with fallback to mock data
 * @param options Configuration for fetching with mock fallback
 * @returns The data from backend or mock data if backend fails
 */
export async function fetchWithMockFallback<T>(
  options: WithMockFallback<T>,
): Promise<T> {
  // If using mock data explicitly, return it immediately
  if (options.useMock || shouldUseMockData()) {
    console.info("Using mock data as configured");
    return options.mockData;
  }

  try {
    // Try to fetch real data
    const data = await options.fetch();
    return data;
  } catch (error) {
    // Log error and fall back to mock data
    console.warn("Backend fetch failed, falling back to mock data:", error);
    return options.mockData;
  }
}
