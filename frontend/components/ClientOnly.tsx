'use client';

import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A wrapper component that ensures its children are only rendered on the client-side.
 * This prevents "Cannot read properties of null (reading 'useState')" errors
 * that occur when React hooks are executed during server-side rendering.
 */
export function ClientOnly({ children, fallback }: ClientOnlyProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return fallback ? 
      <>{fallback}</> : 
      <div className="animate-pulse bg-muted/30 w-full h-24 rounded-md" />;
  }
  
  return <>{children}</>;
}

// HOC version for dynamic imports
export function withClientOnly<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  function WithClientOnly(props: P) {
    return (
      <ClientOnly>
        <Component {...props} />
      </ClientOnly>
    );
  }
  
  const displayName = 
    Component.displayName || 
    Component.name || 
    'Component';
    
  WithClientOnly.displayName = `withClientOnly(${displayName})`;
  
  return WithClientOnly;
}