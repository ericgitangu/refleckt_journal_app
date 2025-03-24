"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorBoundaryProps {
  error: Error;
  reset: () => void;
  title?: string;
  showDetails?: boolean;
  variant?: "full" | "inline" | "minimal";
}

export function ReactErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
  showDetails = false,
  variant = "full",
}: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("Component error:", error);
  }, [error]);

  if (variant === "minimal") {
    return (
      <div className="p-2 text-sm text-[hsl(var(--destructive))] flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>{title}</span>
        <Button size="sm" variant="ghost" onClick={reset} className="h-6 px-2">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {title}
          {showDetails && (
            <div className="text-xs mt-1 opacity-80">{error.message}</div>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={reset}
            className="mt-2"
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Full version
  return (
    <Card className="shadow-md journal-paper">
      <CardHeader className="border-b border-[rgba(0,0,0,0.1)]">
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-[hsl(var(--destructive))]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {showDetails && (
          <p className="text-sm text-muted-foreground">{error.message}</p>
        )}
      </CardContent>
      <CardFooter className="border-t border-[rgba(0,0,0,0.1)] pt-4">
        <Button
          onClick={reset}
          size="sm"
          className="bg-[hsl(var(--journal-accent))] text-[hsl(var(--journal-ink))]"
        >
          <RefreshCw className="h-3 w-3 mr-2" />
          Try again
        </Button>
      </CardFooter>
    </Card>
  );
}
