"use client";

import React from "react";
import Link from "next/link";
import {
  WifiOff,
  Home,
  RotateCcw,
  ServerCrash,
  CloudOff,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Error page properties
interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  // Get error message or use generic message
  const errorMessage = error?.message || "Something went wrong on our end";

  // Choose appropriate icon based on error type
  const getErrorIcon = () => {
    if (errorMessage.includes("network") || errorMessage.includes("connect")) {
      return <WifiOff className="h-8 w-8 text-[hsl(var(--primary))]" />;
    } else if (errorMessage.includes("server")) {
      return <ServerCrash className="h-8 w-8 text-[hsl(var(--primary))]" />;
    } else if (errorMessage.includes("timeout")) {
      return <CloudOff className="h-8 w-8 text-[hsl(var(--primary))]" />;
    } else {
      return <AlertTriangle className="h-8 w-8 text-[hsl(var(--primary))]" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))] p-4">
      <div className="w-full max-w-md p-8 rounded-lg shadow-lg journal-paper border-[hsl(var(--journal-accent))]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--journal-accent))]/20 flex items-center justify-center mx-auto mb-3">
            {getErrorIcon()}
          </div>
          <h1 className="text-3xl font-serif font-bold">Connection Error</h1>
          <div className="text-muted-foreground mt-2 mb-6">
            <p>We couldn&apos;t connect to our servers.</p>
            <p className="text-sm mt-2">
              {errorMessage}
              {error.digest && (
                <span className="block text-xs mt-1 opacity-70">
                  Error ID: {error.digest}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="h-px bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.1)] my-4" />

        <div className="pt-4 pb-2">
          <p className="text-center text-sm italic text-muted-foreground">
            &ldquo;Even disconnected, your thoughts remain valuable.&rdquo;
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button className="w-full sm:w-auto" onClick={() => reset()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>

          <Link href="/" passHref>
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
