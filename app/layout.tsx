'use client';

import { ReactNode } from 'react';
import { CustomThemeProvider } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { SessionProvider } from 'next-auth/react';
import { TrpcProvider } from '@/providers/TrpcProvider';
import { DefaultSeo } from 'next-seo';
import SEO from '@/config/next-seo.config';

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en">
      <body>
        <DefaultSeo {...SEO} />
        <SessionProvider>
          <TrpcProvider>
            <CustomThemeProvider>
              <header style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
                <ThemeToggle />
              </header>
              <main>
                {children}
              </main>
            </CustomThemeProvider>
          </TrpcProvider>
        </SessionProvider>
      </body>
    </html>
  );
};

export default RootLayout;

