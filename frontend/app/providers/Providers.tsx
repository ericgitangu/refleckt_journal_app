'use client';

import React from 'react';
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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DefaultSeo {...SEO} />
      <JotaiProvider>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TrpcProvider>
              <SWRConfig 
                value={{
                  fetcher: (resource: string, init?: RequestInit) => fetch(resource, init).then(res => res.json()),
                  revalidateOnFocus: false,
                }}
              >
                <ApolloProvider client={client}>
                  <AuthProvider>
                    <OfflineProvider>
                      {children}
                      <Toaster />
                    </OfflineProvider>
                  </AuthProvider>
                </ApolloProvider>
              </SWRConfig>
            </TrpcProvider>
          </ThemeProvider>
        </SessionProvider>
      </JotaiProvider>
    </>
  );
} 