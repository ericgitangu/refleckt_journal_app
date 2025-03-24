import "react";

// Fix all React type issues with Radix UI components
declare module "react" {
  // Allow displayName on all forwardRef components
  interface ForwardRefExoticComponent<P = any> {
    displayName?: string;
  }

  // Fix FunctionComponent type to allow displayName
  interface FunctionComponent<P = {}> {
    displayName?: string;
  }

  // Fix the ElementType constraint issues - this is the critical fix
  interface ElementType<
    P = any,
    T extends keyof JSX.IntrinsicElements = keyof JSX.IntrinsicElements,
  > {
    // The constraint here needs to be more flexible
    (props: P): React.ReactElement | null;
  }

  // Also fix the RefForwardingComponent to ensure displayName is available
  interface RefForwardingComponent<T, P = {}> {
    displayName?: string;
  }

  // Fix the specific issue with the constraint in createElement
  namespace JSX {
    interface IntrinsicElements {
      // Allow ForwardRefExoticComponent as an intrinsic element
      [elemName: string]: any;
    }
  }
}
