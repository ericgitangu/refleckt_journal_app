import React from 'react';

// Direct fix for Radix UI TypeScript issues
declare module 'react' {
  // Fix React's ElementType constraint
  interface ElementType<P = any> {
    // Allow ReactNode instead of just ReactElement | null
    (props: P): React.ReactNode;
  }

  // Fix forwardRef return type
  interface ForwardRefExoticComponent<P = any> {
    displayName?: string;
  }
  
  // Make the actual function returned by forwardRef have displayName
  type ForwardRefRenderFunction<T, P = {}> = {
    (props: P, ref: React.Ref<T>): React.ReactElement | null;
    displayName?: string;
  }
} 