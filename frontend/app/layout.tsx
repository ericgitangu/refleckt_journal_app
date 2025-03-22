import './globals.css';
import type { Metadata } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import { Providers } from '@/app/providers/Providers';

const inter = Inter({ subsets: ['latin'] });
const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

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
  openGraph: {
    title: 'Reflekt - A Personal Journaling App',
    description: 'Reflect on your thoughts with AI-powered insights',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Reflekt Journal App',
      }
    ],
    locale: 'en_US',
    type: 'website',
    siteName: 'Reflekt Journal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reflekt - A Personal Journaling App',
    description: 'Reflect on your thoughts with AI-powered insights',
    images: ['/og-image.jpg'],
    creator: '@reflektapp',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Reflekt Journal',
  },
  applicationName: 'Reflekt Journal',
  formatDetection: {
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

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

