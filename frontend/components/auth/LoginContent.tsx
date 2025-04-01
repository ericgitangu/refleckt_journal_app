"use client";

import React, { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function LoginContent() {
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
    <>
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
          <span className="mr-2">
            <Image
              src="/images/google-logo.svg"
              alt="Google"
              className="w-4 h-4"
              width={16}
              height={16}
              priority
            />
          </span>
          Continue with Google
        </Button>
      </div>

      {/* Error display */}
      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Sign up link */}
      <div className="text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </>
  );
}
