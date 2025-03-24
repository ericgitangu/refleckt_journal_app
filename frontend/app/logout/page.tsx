'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    signOut({ redirect: false }).then(() => {
      router.push('/');
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