"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { transformer } from "@/lib/transformer";
import { trpc } from "@/app/hooks/useTRPC";
import { ClientOnly } from "@/components/ClientOnly";

// Client-side only TrpcProvider implementation
function TrpcProviderImpl({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000, // 5 seconds
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [trpcClient] = useState(() => {
    return trpc.createClient({
      transformer,
      links: [
        httpBatchLink({
          url: "/api/trpc",
        }),
      ],
    });
  });

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

// Wrapper that ensures TrpcProvider is only rendered client-side
export function TrpcProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly fallback={<div className="trpc-loading-placeholder" />}>
      <TrpcProviderImpl>{children}</TrpcProviderImpl>
    </ClientOnly>
  );
}
