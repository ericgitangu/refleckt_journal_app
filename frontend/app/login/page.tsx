import Link from "next/link";
import Image from "next/image";
import { ClientOnly } from "@/components/ClientOnly";
import { LoginContent } from "@/components/auth/LoginContent";

// Metadata for the page
export const metadata = {
  title: "Login - Reflekt Journal",
  description: "Sign in to your Reflekt Journal account",
};

// Main login page - server component
export default function LoginPage() {
  return (
    <div className="container relative min-h-screen flex flex-col items-center justify-center">
      <div className="w-full max-w-[350px] space-y-6 text-center">
        {/* Logo */}
        <div className="mx-auto rounded-full border-2 w-24 h-24 flex items-center justify-center p-2">
          <img
            src="/logo.jpg"
            alt="Reflekt Journal Logo"
            className="rounded-full w-20 h-20"
          />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome to Reflekt
          </h1>
          <p className="text-muted-foreground">
            Your personal journaling companion
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © {new Date().getFullYear()} Reflekt Journal. All rights reserved.
          </p>
        </div>

        {/* Auth component - client only */}
        <ClientOnly
          fallback={
            <div className="flex flex-col space-y-3 animate-pulse">
              <div className="w-full h-10 bg-muted rounded-md" />
              <div className="w-full h-10 bg-muted rounded-md" />
              <div className="w-full h-5 bg-muted rounded-md" />
            </div>
          }
        >
          <LoginContent />
        </ClientOnly>

        {/* Terms and privacy notice */}
        <p className="text-xs text-muted-foreground px-6">
          By logging in, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
