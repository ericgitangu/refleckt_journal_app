import { getSession } from "next-auth/react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.refleckt.app";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
  useAuth?: boolean;
}

/**
 * API client for making requests to the backend
 * Handles authentication and error handling
 */
export async function apiClient<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  // Set default options
  const useAuth = options.useAuth !== false;

  // Get auth session for token if needed
  let token: string | undefined = undefined;
  if (useAuth) {
    const session = await getSession();
    token = session?.accessToken as string | undefined;

    if (!token) {
      throw new Error("Authentication required but no token available");
    }
  }

  // Prepare request options
  const fetchOptions: RequestInit = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };

  try {
    // Make the request
    const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

    // Handle non-2xx responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      throw new Error(
        `API error: ${response.status} - ${errorText || response.statusText}`,
      );
    }

    // Parse and return the response
    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Server-side API client for use in API routes
 * Takes a token directly rather than retrieving from session
 */
export async function serverApiClient<T>(
  endpoint: string,
  token: string,
  options: Omit<ApiOptions, "useAuth"> = {},
): Promise<T> {
  try {
    const fetchOptions: RequestInit = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server API error (${response.status}): ${errorText}`);
      throw new Error(
        `API error: ${response.status} - ${errorText || response.statusText}`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`Server API request failed for ${endpoint}:`, error);
    throw error;
  }
}
