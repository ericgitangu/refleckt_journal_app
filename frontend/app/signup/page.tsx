import Image from "next/image";
import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";
import { SignupContent } from "@/components/auth/SignupContent";

// Main signup page - server component
export default function SignupPage() {
  return (
    <div className="container relative min-h-screen flex flex-col items-center justify-center">
      <div className="w-full max-w-[350px] space-y-6 text-center">
        {/* Logo (can be rendered server-side) */}
        <div className="mx-auto rounded-full border-2 w-24 h-24 flex items-center justify-center">
          <Image
            src="/logo.jpg"
            alt="Reflekt Journal Logo"
            width={120}
            height={120}
            priority
            className="rounded-md border-2 border-black dark:border-transparent"
          />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Create Your Account
          </h1>
          <p className="text-muted-foreground">
            Join Reflekt Journal and start your reflective journey
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © {new Date().getFullYear()} Reflekt Journal. All rights reserved.
          </p>
        </div>

        {/* Client-side authentication component */}
        <ClientOnly
          fallback={
            <div className="flex flex-col space-y-3 animate-pulse">
              <div className="w-full h-10 bg-muted rounded-md" />
              <div className="w-full h-10 bg-muted rounded-md" />
            </div>
          }
        >
          <SignupContent />
        </ClientOnly>

        {/* Terms and privacy notice - server-side renderable */}
        <p className="text-xs text-muted-foreground px-6">
          By signing up, you agree to our{" "}
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
