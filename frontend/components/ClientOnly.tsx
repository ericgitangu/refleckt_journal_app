'use client';

import { useEffect, useState, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ClientOnly({ children, fallback }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    // Return the provided fallback or a default skeleton
    return fallback || <Skeleton className="w-full h-full min-h-[200px] rounded-md" />;
  }
  
  return <>{children}</>;
}