declare module '@radix-ui/react-toast' {
  import * as React from 'react';

  // Define basic component props
  interface ToastPrimitivesProps {
    className?: string;
  }

  // Define specific component props
  interface ToastViewportProps extends ToastPrimitivesProps {
    // Additional props specific to viewport
  }

  interface ToastProps extends ToastPrimitivesProps {
    // Additional props specific to toast
  }

  interface ToastActionProps extends ToastPrimitivesProps {
    // Additional props specific to action
  }

  interface ToastCloseProps extends ToastPrimitivesProps {
    // Additional props specific to close
  }

  interface ToastTitleProps extends ToastPrimitivesProps {
    // Additional props specific to title
  }

  interface ToastDescriptionProps extends ToastPrimitivesProps {
    // Additional props specific to description
  }

  // Export component types
  export const Provider: React.FC<React.PropsWithChildren<{}>>;
  export const Viewport: React.ForwardRefExoticComponent<ToastViewportProps & React.RefAttributes<HTMLOListElement>>;
  export const Root: React.ForwardRefExoticComponent<ToastProps & React.RefAttributes<HTMLLIElement>>;
  export const Action: React.ForwardRefExoticComponent<ToastActionProps & React.RefAttributes<HTMLButtonElement>>;
  export const Close: React.ForwardRefExoticComponent<ToastCloseProps & React.RefAttributes<HTMLButtonElement>>;
  export const Title: React.ForwardRefExoticComponent<ToastTitleProps & React.RefAttributes<HTMLDivElement>>;
  export const Description: React.ForwardRefExoticComponent<ToastDescriptionProps & React.RefAttributes<HTMLDivElement>>;
} 