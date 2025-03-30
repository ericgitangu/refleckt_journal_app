"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ClientOnly } from "@/components/ClientOnly";

// Client component with hooks
function LogoutContent() {
  const router = useRouter();

  useEffect(() => {
    signOut({ redirect: false }).then(() => {
      router.push("/");
    });
  }, [router]);

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Signing out...</h1>
        <p className="text-muted-foreground">You will be redirected shortly.</p>
      </div>
    </div>
  );
}

// Page component that wraps the client component
export default function LogoutPage() {
  return (
    <ClientOnly fallback={
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Preparing to sign out...</h1>
        </div>
      </div>
    }>
      <LogoutContent />
    </ClientOnly>
  );
}
