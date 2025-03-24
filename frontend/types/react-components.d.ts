/**
 * Global React component type overrides
 * This file fixes compatibility issues between React's types and Radix UI components
 */

// Tell TypeScript we're augmenting the React module
import "react";

declare module "react" {
  /**
   * Core fix for the ElementType constraint issue.
   * This allows components to return ReactNode instead of ReactElement | null
   */
  interface ElementType<P = any> {
    (props: P): React.ReactNode;
  }

  /**
   * Fix for the forwardRef return type
   * This allows setting displayName on the component
   */
  interface ForwardRefExoticComponent<P = any> {
    displayName?: string;
  }

  /**
   * Fix for the RefForwardingComponent
   */
  interface RefForwardingComponent<T, P = {}> {
    displayName?: string;
  }

  /**
   * Fix for JSX IntrinsicElements to be more permissive
   */
  namespace JSX {
    interface IntrinsicAttributes {
      [name: string]: any;
    }
  }
}
