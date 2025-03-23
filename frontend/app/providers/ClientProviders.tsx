'use client';

import { Providers } from '@/app/providers/Providers';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <Providers>{children}</Providers>
  );
} 