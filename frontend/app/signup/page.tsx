'use client';

import React, { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

export default function SignUpPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/journal';
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (session?.user) {
      router.push(callbackUrl);
    }
  }, [session, router, callbackUrl]);

  // For Cognito, we'll redirect to the Cognito hosted UI for signup
  // The actual signup process will be handled by Cognito
  const handleSignup = async (provider: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For Cognito, we redirect to the sign-in page with signup parameter
      const result = await signIn(provider, {
        callbackUrl,
        redirect: true,
      });
      
      if (!result?.ok) {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader className="space-y-1">
          <Link href="/" className="flex justify-center mb-4">
            <Image 
              src="/logo.jpg" 
              alt="Refleckt Journal Logo" 
              width={120} 
              height={120} 
              className="rounded-md"
            />
          </Link>
          <CardTitle className="text-2xl text-center">Create an account</CardTitle>
          <CardDescription className="text-center">
            Sign up to start your journaling journey
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button
            variant="outline"
            onClick={() => signIn('google', { callbackUrl })}
            className="w-full"
          >
            <Icons.google className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>
          <div className="text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 