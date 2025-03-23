'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');

  // Map error codes to user-friendly messages
  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'You do not have permission to sign in.';
      case 'Verification':
        return 'The verification token has expired or has already been used.';
      case 'OAuthSignin':
        return 'Error in the OAuth sign-in process.';
      case 'OAuthCallback':
        return 'Error in the OAuth callback process.';
      case 'OAuthCreateAccount':
        return 'Could not create a user account using the OAuth provider.';
      case 'EmailCreateAccount':
        return 'Could not create a user account using email provider.';
      case 'Callback':
        return 'Error in the OAuth callback handler.';
      case 'OAuthAccountNotLinked':
        return 'This email is already associated with another account. Sign in using the original account provider.';
      case 'EmailSignin':
        return 'The email could not be sent.';
      case 'CredentialsSignin':
        return 'Sign in failed. Check your credentials and try again.';
      case 'SessionRequired':
        return 'Authentication is required to access this page.';
      default:
        return 'An unknown error occurred during authentication.';
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Authentication Error</h1>
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            <p className="font-medium">Error: {error}</p>
            <p className="mt-2">{getErrorMessage(error)}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col space-y-4">
          <Link 
            href="/login"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-center transition-colors"
          >
            Try signing in again
          </Link>
          
          <Link 
            href="/"
            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium text-center transition-colors"
          >
            Return to home
          </Link>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            If you continue to experience issues, please{' '}
            <a href="mailto:support@reflekt-journal.com" className="text-blue-600 hover:text-blue-800 font-medium">
              contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 