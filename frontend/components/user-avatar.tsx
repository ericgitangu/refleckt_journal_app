"use client";

// @ts-ignore - Importing the avatar components with disabled type checking
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  src?: string;
  alt?: string;
  fallback: string;
  className?: string;
}

export function UserAvatar({ src, alt, fallback, className }: UserAvatarProps) {
  // Using the avatar components with disabled type checking
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt={alt || fallback} /> : null}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}
