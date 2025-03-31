'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { Provider as JotaiProvider } from 'jotai';
import { SWRConfig } from 'swr';
import { SessionProvider } from 'next-auth/react';
import { TrpcProvider } from '@/app/providers/TrpcProvider';
import { client } from '@/lib/apollo';
import { AuthProvider } from '@/lib/auth/auth-context';
import { OfflineProvider } from '@/lib/offline/offline-context';
import { Toaster } from '@/components/ui/toaster';
import { TrueErrorBoundary } from '@/components/ui/react-error-boundary';
import { ReactNode } from 'react';
import { ClientOnly } from '@/components/ClientOnly';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    // Wrap all providers in ClientOnly including ThemeProvider which also uses hooks
    <ClientOnly fallback={<div className="min-h-screen" />}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <JotaiProvider>
          <SWRConfig 
            value={{
              fetcher: (resource: string, init?: RequestInit) => fetch(resource, init).then(res => res.json()),
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
                        <Toaster />
                      </TrueErrorBoundary>
                    </OfflineProvider>
                  </AuthProvider>
              </TrpcProvider>
            </SessionProvider>
          </SWRConfig>
        </JotaiProvider>
      </ThemeProvider>
    </ClientOnly>
  );
} 