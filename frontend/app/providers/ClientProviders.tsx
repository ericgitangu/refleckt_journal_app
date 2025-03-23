'use client';

import { Providers } from '@/app/providers/Providers';
import { ApiConfigProvider } from '@/context/ApiConfigContext';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ApiConfigProvider>
      <Providers>{children}</Providers>
    </ApiConfigProvider>
  );
} 