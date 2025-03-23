import type { Metadata, Viewport } from 'next';

// Metadata export for journal/new route
export const metadata: Metadata = {
  title: 'New Journal Entry - Reflekt',
  description: 'Create a new journal entry in your Reflekt journal',
  openGraph: {
    title: 'New Journal Entry - Reflekt',
    description: 'Create a new journal entry in your Reflekt journal',
    type: 'website',
  }
};

// Separate viewport export as required by Next.js
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}; 