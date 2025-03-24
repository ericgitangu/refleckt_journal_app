'use client';

import React from 'react';
import { WifiOff, Home, RotateCcw } from 'lucide-react';

// Global error page properties
interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="w-full max-w-md p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
                <WifiOff className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Connection Error
              </h1>
              <div className="text-gray-600 dark:text-gray-300 mt-2 mb-6">
                <p>We couldn&apos;t connect to our servers.</p>
                <p className="text-sm mt-2">
                  {error.message || 'Something went wrong on our end'}
                  {error.digest && <span className="block text-xs mt-1 opacity-70">Error ID: {error.digest}</span>}
                </p>
              </div>
            </div>
            
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-4" />
            
            <div className="pt-4 pb-2">
              <p className="text-center text-sm italic text-gray-600 dark:text-gray-400">
                &ldquo;Even disconnected, your thoughts remain valuable.&rdquo;
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => reset()}
                className="flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition w-full sm:w-auto"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </button>
              
              <a 
                href="/"
                className="flex justify-center items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition w-full sm:w-auto text-center"
              >
                <Home className="h-4 w-4" />
                Return Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
} 