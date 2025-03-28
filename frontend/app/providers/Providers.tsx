'use client';

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Provider as JotaiProvider } from 'jotai';
import { SWRConfig } from 'swr';
import { SessionProvider } from 'next-auth/react';
import { TrpcProvider } from '@/app/providers/TrpcProvider';
import { DefaultSeo } from 'next-seo';
import SEO from '@/config/next-seo.config';
import { ApolloProvider } from '@apollo/client';
import { client } from '@/lib/apollo';
import { AuthProvider } from '@/lib/auth/auth-context';
import { OfflineProvider } from '@/lib/offline/offline-context';
import { Toaster } from '@/components/ui/toaster';
import { TrueErrorBoundary } from '@/components/ui/react-error-boundary';
import { ReactNode } from 'react';

// Client-side only component wrapper for Next.js 14 compatibility
// This solves the "Cannot read properties of null (reading 'useContext')" errors
const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  // Use a more explicit naming to distinguish state variables
  const [isMounted, setIsMounted] = useState(false);
  
  // Only run the effect on the client, never during static generation
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Render nothing on the server, children only on the client
  // This prevents hooks from being executed during static generation
  if (!isMounted) {
    // Return a minimal placeholder that matches the layout expectations
    return <div className="client-only-placeholder" />;
  }
  
  return <>{children}</>;
};

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    // Wrap all providers in ClientOnly including ThemeProvider which also uses hooks
    <ClientOnly>
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
                <ApolloProvider client={client}>
                  <AuthProvider>
                    <OfflineProvider>
                      <TrueErrorBoundary
                        fallbackUI="full"
                        title="Something went wrong"
                        showDetails={true}
                      >
                        {/* <DefaultSeo {...SEO} /> */}
                        {children}
                        <Toaster />
                      </TrueErrorBoundary>
                    </OfflineProvider>
                  </AuthProvider>
                </ApolloProvider>
              </TrpcProvider>
            </SessionProvider>
          </SWRConfig>
        </JotaiProvider>
      </ThemeProvider>
    </ClientOnly>
  );
} 