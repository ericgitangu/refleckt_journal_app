"use client";

import React, { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClientOnly } from "@/components/ClientOnly";

const LoginContent = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/journal";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (session?.user) {
      router.push(callbackUrl);
    }
  }, [session, router, callbackUrl]);

  const handleLogin = async (provider: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn(provider, {
        callbackUrl,
        redirect: true,
      });

      if (!result?.ok) {
        setError("Authentication failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container relative flex h-screen w-screen flex-col items-center justify-center">
      {/* Theme toggle in top right corner */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[350px] space-y-6 text-center">
        {/* Logo (circular) */}
        <div className="mx-auto rounded-full border-2 w-24 h-24 flex items-center justify-center">
          <Image
            src="/logo.jpg"
            alt="Reflekt Journal Logo"
            width={120}
            height={120}
            className="rounded-md border-2 border-black dark:border-transparent"
          />
        </div>

        {/* Heading and subheading */}
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

        {/* Auth buttons */}
        <div className="flex flex-col space-y-3">
          <Button
            onClick={() => handleLogin("cognito")}
            className="w-full border border-gray-800 dark:border-transparent"
            disabled={isLoading}
          >
            Continue with Cognito
          </Button>

          <Button
            variant="outline"
            onClick={() => handleLogin("google")}
            className="w-full"
            disabled={isLoading}
          >
            <Image
              src="/images/google-logo.svg"
              alt="Google"
              width={16}
              height={16}
              className="mr-2"
            />
            Continue with Google
          </Button>
        </div>

        {/* Error display */}
        {error && <p className="text-destructive text-sm">{error}</p>}

        {/* Sign up link */}
        <div className="text-sm">
          Don&rsquo;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>

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
};

export default function LoginPage() {
  return (
    <ClientOnly>
      <LoginContent />
    </ClientOnly>
  );
}
