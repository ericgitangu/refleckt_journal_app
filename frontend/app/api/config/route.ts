import { NextResponse } from 'next/server';

// Public configuration that can be safely exposed to the frontend
interface PublicConfig {
  apiUrl: string;
  services: {
    entries: boolean;
    analytics: boolean;
    settings: boolean;
    ai: boolean;
  };
  features: {
    offlineMode: boolean;
    aiAnalysis: boolean;
    moodTracking: boolean;
  };
  version: string;
}

// GET: Fetch public configuration
export async function GET() {
  // Determine environment and features
  const isDev = process.env.NODE_ENV === 'development';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  // Configuration that will be exposed to the frontend
  const config: PublicConfig = {
    apiUrl,
    services: {
      entries: true,
      analytics: true,
      settings: true,
      ai: true,
    },
    features: {
      offlineMode: true,
      aiAnalysis: true,
      moodTracking: true,
    },
    version: '1.0.0', // Should match package.json or be dynamically fetched
  };

  // If we're in development, we might want to provide more information
  if (isDev) {
    return NextResponse.json({
      ...config,
      _dev: {
        apiUrl_note: 'Make sure to update NEXT_PUBLIC_API_URL in .env with your deployed API',
        env: process.env.NODE_ENV,
      }
    });
  }

  return NextResponse.json(config);
} 