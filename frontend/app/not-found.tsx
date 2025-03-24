import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { BackButton } from "@/components/navigation/back-button";

// Disable static generation for this page
export const dynamic = "force-dynamic";

// Server component version of not-found page
// No client-side hooks or context that could cause SSR issues
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))] p-4">
      <div className="w-full max-w-md p-8 rounded-lg shadow-lg journal-paper border-[hsl(var(--journal-accent))]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--journal-accent))]/20 flex items-center justify-center mx-auto mb-3">
            <FileQuestion className="h-8 w-8 text-[hsl(var(--primary))]" />
          </div>
          <h1 className="text-3xl font-serif font-bold">
            404 - Page Not Found
          </h1>
          <p className="text-muted-foreground mt-2 mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>

        <div className="h-px bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.1)] my-4" />

        <div className="pt-4 pb-2">
          <p className="text-center text-sm italic text-muted-foreground">
            &ldquo;Journal pages are meant to be filled, not left blank.&rdquo;
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90 h-10 px-4 py-2 w-full sm:w-auto"
          >
            <Home className="mr-2 h-4 w-4" />
            Return Home
          </Link>

          <BackButton />
        </div>
      </div>
    </div>
  );
}
