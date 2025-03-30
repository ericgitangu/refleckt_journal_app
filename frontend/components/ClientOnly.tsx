'use client';

import { useEffect, useState, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <Skeleton className="w-full h-full min-h-[200px] rounded-md" />;
  }
  
  return <>{children}</>;
}