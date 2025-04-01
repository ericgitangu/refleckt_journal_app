"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { Provider as JotaiProvider } from "jotai";
import { SWRConfig } from "swr";
import { SessionProvider } from "next-auth/react";
import { TrpcProvider } from "@/app/providers/TrpcProvider";
import { AuthProvider } from "@/lib/auth/auth-context";
import { OfflineProvider } from "@/lib/offline/offline-context";
import { TrueErrorBoundary } from "@/components/ui/react-error-boundary";
import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers component wraps the application with all necessary context providers.
 * This is marked as 'use client' and should not be rendered by server components.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <JotaiProvider>
        <SWRConfig
          value={{
            fetcher: (resource: string, init?: RequestInit) =>
              fetch(resource, init).then((res) => res.json()),
            revalidateOnFocus: false,
          }}
        >
          <SessionProvider>
            <TrpcProvider>
              <AuthProvider>
                <OfflineProvider>
                  <TrueErrorBoundary
                    fallbackUI="full"
                    title="Something went wrong"
                    showDetails={true}
                  >
                    {children}
                  </TrueErrorBoundary>
                </OfflineProvider>
              </AuthProvider>
            </TrpcProvider>
          </SessionProvider>
        </SWRConfig>
      </JotaiProvider>
    </ThemeProvider>
  );
}
