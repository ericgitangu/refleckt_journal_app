'use client';

import React, { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
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

  const handleLogin = async (provider: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signIn(provider, {
        callbackUrl,
        redirect: true,
      });
      
      if (!result?.ok) {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="flex flex-col items-center justify-center">
          <div className="mb-6 relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 shadow-md">
            <Image 
              src="/logo.jpg" 
              alt="Reflekt Logo" 
              fill
              style={{ objectFit: 'cover' }}
              priority
              className="rounded-full"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Reflekt</h1>
          <p className="mt-2 text-gray-600">Your personal journaling companion</p>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={() => handleLogin('cognito')}
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-3 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70"
          >
            {isLoading ? 'Logging in...' : 'Continue with Cognito'}
          </button>
          
          <button
            onClick={() => handleLogin('google')}
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-3 py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-lg font-medium transition-colors disabled:opacity-70"
          >
            <Image src="/images/google-logo.svg" alt="Google logo" width={20} height={20} />
            {isLoading ? 'Logging in...' : 'Continue with Google'}
          </button>
        </div>

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link href="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign up
            </Link>
          </p>
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>By logging in, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
} 