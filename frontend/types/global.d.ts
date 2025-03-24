// Global type definitions to fix Radix UI compatibility issues
import 'react';

declare module 'react' {
  // Fix the ElementType constraint issue
  interface ElementType<P = any> {
    // Use any instead of ReactNode to avoid import issues
    (props: P): any; 
  }

  // Add displayName to forwardRef components
  interface ForwardRefExoticComponent<P = any> {
    displayName?: string;
  }
} 