"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  Home,
  ArrowLeft,
  AlertTriangle,
  UserX,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");
  const [errorInfo, setErrorInfo] = useState({
    title: "Authentication Error",
    message: "An error occurred during authentication.",
    icon: <AlertTriangle className="h-8 w-8 text-[hsl(var(--primary))]" />,
  });

  useEffect(() => {
    // Set error details based on the error code from NextAuth
    switch (error) {
      case "Configuration":
        setErrorInfo({
          title: "Server Configuration Error",
          message:
            "There is a problem with the server configuration. Please contact support.",
          icon: <ShieldAlert className="h-8 w-8 text-[hsl(var(--primary))]" />,
        });
        break;
      case "AccessDenied":
        setErrorInfo({
          title: "Access Denied",
          message: "You do not have permission to sign in.",
          icon: <Lock className="h-8 w-8 text-[hsl(var(--primary))]" />,
        });
        break;
      case "Verification":
        setErrorInfo({
          title: "Verification Error",
          message: "The verification link has expired or was already used.",
          icon: (
            <AlertTriangle className="h-8 w-8 text-[hsl(var(--primary))]" />
          ),
        });
        break;
      case "OAuthSignin":
      case "OAuthCallback":
      case "OAuthCreateAccount":
      case "OAuthAccountNotLinked":
      case "EmailCreateAccount":
      case "Callback":
      case "OAuthSignInError":
        setErrorInfo({
          title: "Sign In Error",
          message:
            "There was a problem with your authentication provider. Please try again.",
          icon: <UserX className="h-8 w-8 text-[hsl(var(--primary))]" />,
        });
        break;
      case "SessionRequired":
        setErrorInfo({
          title: "Session Required",
          message: "You need to be signed in to access this page.",
          icon: <Lock className="h-8 w-8 text-[hsl(var(--primary))]" />,
        });
        break;
      default:
        setErrorInfo({
          title: "Authentication Error",
          message:
            "An unexpected error occurred during authentication. Please try again.",
          icon: (
            <AlertTriangle className="h-8 w-8 text-[hsl(var(--primary))]" />
          ),
        });
    }
  }, [error]);

  return (
    <div className="container relative flex h-screen w-screen flex-col items-center justify-center">
      <div className="w-full max-w-md p-8 rounded-lg shadow-lg journal-paper border-[hsl(var(--journal-accent))]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--journal-accent))]/20 flex items-center justify-center mx-auto mb-3">
            {errorInfo.icon}
          </div>
          <h1 className="text-3xl font-serif font-bold">{errorInfo.title}</h1>
          <div className="text-muted-foreground mt-2 mb-6">
            <p>{errorInfo.message}</p>
            <p className="text-sm mt-2">Error code: {error || "unknown"}</p>
          </div>
        </div>

        <div className="h-px bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.1)] my-4" />

        <div className="pt-4 pb-2">
          <p className="text-center text-sm italic text-muted-foreground">
            &ldquo;Every error is a step closer to success.&rdquo;
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            className="w-full sm:w-auto"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>

          <Link href="/login" passHref>
            <Button variant="secondary" className="w-full sm:w-auto">
              Try Again
            </Button>
          </Link>

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
