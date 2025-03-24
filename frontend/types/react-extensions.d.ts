import * as React from 'react';

declare module 'react' {
  // Add displayName to forwardRef result
  interface ForwardRefExoticComponent<P = any> {
    displayName?: string;
  }
  
  // Add displayName to function components
  interface FunctionComponent<P = {}> {
    displayName?: string;
  }
  
  // Improve ReturnType for Refs
  type RefForwardingComponent<T, P = {}> = {
    (props: P, ref: React.ForwardedRef<T>): React.ReactElement | null;
    displayName?: string;
  }
  
  // Allow any ElementType for component types
  interface ElementType<P = any> {
    (props: P): React.ReactElement | null;
  }
} 