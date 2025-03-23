'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[hsl(var(--background))]">
      <Card className="max-w-md w-full shadow-lg border-[hsl(var(--journal-accent))]">
        <CardHeader className="border-b border-[rgba(0,0,0,0.1)] pb-4">
          <CardTitle className="font-serif text-2xl flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-[hsl(var(--destructive))]" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="destructive" className="mb-4 bg-[hsl(var(--destructive))]/10">
            <AlertTitle className="font-medium">Error Details</AlertTitle>
            <AlertDescription className="text-sm opacity-80">
              {error.message || "An unexpected error occurred. Our team has been notified."}
            </AlertDescription>
          </Alert>
          <p className="text-muted-foreground text-sm italic mt-2">
            Error reference: {error.digest || "unknown"}
          </p>
        </CardContent>
        <CardFooter className="border-t border-[rgba(0,0,0,0.1)] pt-4 flex justify-end">
          <Button 
            onClick={reset} 
            className="flex items-center gap-2 bg-[hsl(var(--journal-accent))] text-[hsl(var(--journal-ink))] hover:bg-[hsl(var(--journal-accent))]/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 