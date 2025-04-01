"use client";

import React, { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function SignupContent() {
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

  const handleSignup = async (provider: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn(provider, {
        callbackUrl,
        redirect: true,
      });

      if (!result?.ok) {
        setError("Registration failed. Please try again.");
      }
    } catch (err) {
      console.error("Signup error:", err);
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
          onClick={() => handleSignup("cognito")}
          className="w-full border border-gray-800 dark:border-transparent"
          disabled={isLoading}
        >
          Continue with Cognito
        </Button>

        <Button
          variant="outline"
          onClick={() => handleSignup("google")}
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

      {/* Login link */}
      <div className="text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </>
  );
}
