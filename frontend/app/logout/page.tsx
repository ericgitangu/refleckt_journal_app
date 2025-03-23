'use client';

import React, { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LogoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-logout if user is authenticated
  useEffect(() => {
    if (session) {
      handleLogout();
    }
  }, [session]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setError(null);

    try {
      await signOut({ redirect: false });
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to log out. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Logging Out</h1>
          <p className="mt-2 text-gray-600">Thank you for using Reflekt Journal</p>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          {isLoggingOut ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Sign out
            </button>
          )}
        </div>

        {!isLoggingOut && (
          <div className="mt-6 text-center">
            <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
              Return to home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 