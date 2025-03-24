// Type definitions for Radix UI components

// Common Radix UI props
interface RadixUIProps {
  className?: string;
}

// Avatar component types
declare module "@radix-ui/react-avatar" {
  import * as React from "react";

  // Root props
  export interface AvatarProps extends RadixUIProps {
    asChild?: boolean;
  }

  // Image props
  export interface AvatarImageProps extends RadixUIProps {
    src?: string;
    alt?: string;
    onLoadingStatusChange?: (
      status: "idle" | "loading" | "loaded" | "error",
    ) => void;
  }

  // Fallback props
  export interface AvatarFallbackProps extends RadixUIProps {
    asChild?: boolean;
    delayMs?: number;
  }

  // Component types
  export const Root: React.ForwardRefExoticComponent<
    AvatarProps & React.RefAttributes<HTMLSpanElement>
  >;
  export const Image: React.ForwardRefExoticComponent<
    AvatarImageProps & React.RefAttributes<HTMLImageElement>
  >;
  export const Fallback: React.ForwardRefExoticComponent<
    AvatarFallbackProps & React.RefAttributes<HTMLSpanElement>
  >;
}

// Toast component types
declare module "@radix-ui/react-toast" {
  import * as React from "react";

  // Define specific component props
  interface ToastViewportProps extends RadixUIProps {
    // Additional props specific to viewport
  }

  interface ToastProps extends RadixUIProps {
    // Additional props specific to toast
  }

  interface ToastActionProps extends RadixUIProps {
    // Additional props specific to action
  }

  interface ToastCloseProps extends RadixUIProps {
    // Additional props specific to close
  }

  interface ToastTitleProps extends RadixUIProps {
    // Additional props specific to title
  }

  interface ToastDescriptionProps extends RadixUIProps {
    // Additional props specific to description
  }

  // Export component types
  export const Provider: React.FC<React.PropsWithChildren<{}>>;
  export const Viewport: React.ForwardRefExoticComponent<
    ToastViewportProps & React.RefAttributes<HTMLOListElement>
  >;
  export const Root: React.ForwardRefExoticComponent<
    ToastProps & React.RefAttributes<HTMLLIElement>
  >;
  export const Action: React.ForwardRefExoticComponent<
    ToastActionProps & React.RefAttributes<HTMLButtonElement>
  >;
  export const Close: React.ForwardRefExoticComponent<
    ToastCloseProps & React.RefAttributes<HTMLButtonElement>
  >;
  export const Title: React.ForwardRefExoticComponent<
    ToastTitleProps & React.RefAttributes<HTMLDivElement>
  >;
  export const Description: React.ForwardRefExoticComponent<
    ToastDescriptionProps & React.RefAttributes<HTMLDivElement>
  >;
}

// Dropdown Menu component types
declare module "@radix-ui/react-dropdown-menu" {
  import * as React from "react";

  // Base props
  export interface DropdownMenuItemProps extends RadixUIProps {
    asChild?: boolean;
    disabled?: boolean;
    onSelect?: (event: Event) => void;
    textValue?: string;
  }

  // Checkbox and Radio interface
  interface CheckableItemProps extends DropdownMenuItemProps {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }

  // Component specific props
  export interface DropdownMenuContentProps extends RadixUIProps {
    asChild?: boolean;
    loop?: boolean;
    onCloseAutoFocus?: (event: Event) => void;
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
    onPointerDownOutside?: (event: PointerEvent) => void;
    onFocusOutside?: (event: FocusEvent) => void;
    onInteractOutside?: (event: React.MouseEvent | React.TouchEvent) => void;
    portalled?: boolean;
    forceMount?: boolean;
    side?: "top" | "right" | "bottom" | "left";
    sideOffset?: number;
    align?: "start" | "center" | "end";
    alignOffset?: number;
    avoidCollisions?: boolean;
    collisionPadding?:
      | number
      | Partial<Record<"top" | "right" | "bottom" | "left", number>>;
  }

  export interface DropdownMenuSubContentProps
    extends DropdownMenuContentProps {}

  export interface DropdownMenuSubTriggerProps extends DropdownMenuItemProps {}

  export interface DropdownMenuCheckboxItemProps extends CheckableItemProps {}

  export interface DropdownMenuRadioItemProps extends CheckableItemProps {
    value: string;
  }

  export interface DropdownMenuLabelProps extends RadixUIProps {
    asChild?: boolean;
  }

  export interface DropdownMenuSeparatorProps extends RadixUIProps {
    asChild?: boolean;
  }

  // Root and Trigger
  export const Root: React.FC<
    RadixUIProps & {
      modal?: boolean;
      open?: boolean;
      defaultOpen?: boolean;
      onOpenChange?: (open: boolean) => void;
    }
  >;
  export const Trigger: React.ForwardRefExoticComponent<
    RadixUIProps & { asChild?: boolean } & React.RefAttributes<HTMLElement>
  >;
  export const Portal: React.FC<{
    children: React.ReactNode;
    container?: HTMLElement;
  }>;
  export const Content: React.ForwardRefExoticComponent<
    DropdownMenuContentProps & React.RefAttributes<HTMLDivElement>
  >;
  export const Arrow: React.ForwardRefExoticComponent<
    RadixUIProps & React.RefAttributes<HTMLElement>
  >;
  export const Item: React.ForwardRefExoticComponent<
    DropdownMenuItemProps & React.RefAttributes<HTMLDivElement>
  >;
  export const Group: React.FC<RadixUIProps & { asChild?: boolean }>;
  export const Label: React.ForwardRefExoticComponent<
    DropdownMenuLabelProps & React.RefAttributes<HTMLDivElement>
  >;
  export const CheckboxItem: React.ForwardRefExoticComponent<
    DropdownMenuCheckboxItemProps & React.RefAttributes<HTMLDivElement>
  >;
  export const RadioGroup: React.FC<
    RadixUIProps & { value?: string; onValueChange?: (value: string) => void }
  >;
  export const RadioItem: React.ForwardRefExoticComponent<
    DropdownMenuRadioItemProps & React.RefAttributes<HTMLDivElement>
  >;
  export const Sub: React.FC<
    RadixUIProps & {
      open?: boolean;
      defaultOpen?: boolean;
      onOpenChange?: (open: boolean) => void;
    }
  >;
  export const SubTrigger: React.ForwardRefExoticComponent<
    DropdownMenuSubTriggerProps & React.RefAttributes<HTMLDivElement>
  >;
  export const SubContent: React.ForwardRefExoticComponent<
    DropdownMenuSubContentProps & React.RefAttributes<HTMLDivElement>
  >;
  export const Separator: React.ForwardRefExoticComponent<
    DropdownMenuSeparatorProps & React.RefAttributes<HTMLDivElement>
  >;
  export const ItemIndicator: React.ForwardRefExoticComponent<
    RadixUIProps & {
      asChild?: boolean;
      forceMount?: boolean;
    } & React.RefAttributes<HTMLSpanElement>
  >;
}

// Slot component types
declare module "@radix-ui/react-slot" {
  import * as React from "react";

  export interface SlotProps {
    children?: React.ReactNode;
  }

  export const Slot: React.ForwardRefExoticComponent<
    SlotProps &
      React.HTMLAttributes<HTMLElement> &
      React.RefAttributes<HTMLElement>
  >;
}
