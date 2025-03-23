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

// Absolute URLs in metadata - avoid trailing slash to avoid double slashes in paths
const baseUrl = 'https://refleckt.vercel.app'.replace(/\/$/, '');

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
        // Use absolute URL with direct path to public image (no _next)
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
  authors: [{ name: 'Eric Gitangul' }],
};

// Separate viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// Force dynamic rendering for root layout
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={montserrat.variable}>
      <head>
        {/* Next.js metadata API tags */}
        {/* Explicit fallback meta tags for crawlers */}
        
        <title>Reflekt - A Personal Journaling App</title>
        <meta name="description" content="Capture your thoughts and gain AI-powered insights with this beautiful journaling app" />

        <meta property="og:url" content="https://refleckt.vercel.app" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Reflekt - A Personal Journaling App" />
        <meta property="og:description" content="Capture your thoughts and gain AI-powered insights with this beautiful journaling app" />
        <meta property="og:image" content="https://refleckt.vercel.app/og-image.jpg" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta property="twitter:domain" content="refleckt.vercel.app" />
        <meta property="twitter:url" content="https://refleckt.vercel.app" />
        <meta name="twitter:title" content="Reflekt - A Personal Journaling App" />
        <meta name="twitter:description" content="Capture your thoughts and gain AI-powered insights with this beautiful journaling app" />
        <meta name="twitter:image" content="https://refleckt.vercel.app/og-image.jpg" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

