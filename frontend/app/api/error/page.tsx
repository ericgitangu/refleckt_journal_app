"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ServerCrash, Home, ArrowLeft, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ApiErrorPage() {
  const searchParams = useSearchParams();
  const statusCode = searchParams?.get("status") || "500";
  const message =
    searchParams?.get("message") || "An unexpected API error occurred";

  return (
    <div className="container relative flex h-screen w-screen flex-col items-center justify-center">
      {/* Theme toggle in top right corner */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md p-8 rounded-lg shadow-lg journal-paper border-[hsl(var(--journal-accent))]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--journal-accent))]/20 flex items-center justify-center mx-auto mb-3">
            <ServerCrash className="h-8 w-8 text-[hsl(var(--primary))]" />
          </div>
          <h1 className="text-3xl font-serif font-bold">
            API Error {statusCode}
          </h1>
          <div className="text-muted-foreground mt-2 mb-6">
            <p>There was a problem with our server.</p>
            <p className="text-sm mt-2">{message}</p>
          </div>
        </div>

        <div className="h-px bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.1)] my-4" />

        <div className="pt-4 pb-2">
          <p className="text-center text-sm italic text-muted-foreground">
            &ldquo;Sometimes the server needs a moment to reflect too.&rdquo;
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            className="w-full sm:w-auto"
            onClick={() => window.location.reload()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
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
