import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import { Providers } from '@/app/providers/Providers';

// Load fonts in server component
const inter = Inter({ subsets: ['latin'] });
const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

// Get base URL for absolute URLs in metadata
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://self-reflektions.vercel.app/');

// Static metadata that doesn't depend on contexts or hooks
export const metadata: Metadata = {
  title: 'Reflekt - A Personal Journaling App',
  description: 'Reflect on your thoughts with AI-powered insights',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' }
    ],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  metadataBase: new URL(baseUrl),
  
  // OpenGraph metadata for social sharing
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'Reflekt Journal',
    title: 'Reflekt - A Personal Journaling App',
    description: 'Capture your thoughts and gain AI-powered insights with this beautiful journaling app',
    images: [
      {
        url: `${baseUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Reflekt Journal App',
      }
    ],
  },
  
  // Twitter/X card metadata
  twitter: {
    card: 'summary_large_image',
    title: 'Reflekt Journal',
    description: 'Your personal journaling space with AI-powered insights',
    images: [`${baseUrl}/og-image.jpg`],
  },
  
  // LinkedIn specific (they use OpenGraph)
  // Adding content type and author for better LinkedIn preview
  keywords: ['journal', 'journaling', 'reflection', 'AI', 'insights', 'personal growth'],
  authors: [{ name: 'Reflekt Journal' }],
};

// Separate viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// Force dynamic rendering for root layout
// This is crucial to prevent "Cannot read properties of null (reading 'useRef')" errors
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={montserrat.variable}>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

