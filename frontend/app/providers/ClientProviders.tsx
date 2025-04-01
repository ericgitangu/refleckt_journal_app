"use client";

import { Providers } from "@/app/providers/Providers";
import { ApiConfigProvider } from "@/context/ApiConfigContext";
import { ReactNode, Suspense } from "react";
import { TopNavbar } from "@/components/TopNavbar";
import { ClientFooter } from "@/components/ClientFooter";
import { DebugPanel } from "@/components/DebugPanel";
import { Toaster } from "@/components/ui/toaster";

// Simple loading fallback that doesn't use hooks
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse h-16 w-16 rounded-full bg-neutral-200"></div>
    </div>
  );
}

/**
 * ClientProviders wraps the entire application with necessary providers and UI structure.
 * We place all providers and UI structure here to avoid mixing with server components.
 */
export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ApiConfigProvider>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <TopNavbar />
            <main className="flex-grow">{children}</main>
            <ClientFooter />
            <DebugPanel />
            <Toaster />
          </div>
        </Providers>
      </ApiConfigProvider>
    </Suspense>
  );
}
