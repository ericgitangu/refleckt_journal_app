"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface UseAuthCheckOptions {
  redirectTo?: string;
  redirectIfFound?: boolean;
}

/**
 * A hook for client components to check authentication status
 * and redirect accordingly
 */
export function useAuthCheck(options: UseAuthCheckOptions = {}) {
  const { redirectTo = "/login", redirectIfFound = false } = options;
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!session?.user;

  useEffect(() => {
    // If not finished loading, don't do anything yet
    if (status === "loading") {
      return;
    }

    // Set loading to false after authentication status is determined
    setIsLoading(false);

    if (
      // If redirectTo is set, redirectIfFound is false, and user is not logged in
      !redirectIfFound &&
      !isAuthenticated &&
      redirectTo
    ) {
      // Redirect to login with callback URL
      router.push(
        `${redirectTo}?callbackUrl=${encodeURIComponent(pathname || "/")}`,
      );
    } else if (
      // If redirectIfFound is true and user is logged in
      redirectIfFound &&
      isAuthenticated &&
      redirectTo
    ) {
      // Redirect to the specified URL
      router.push(redirectTo);
    }
  }, [isAuthenticated, redirectIfFound, redirectTo, router, status, pathname]);

  return {
    isAuthenticated,
    isLoading,
    session,
    status,
  };
}
