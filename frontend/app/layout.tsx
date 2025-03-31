import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import ClientProviders from "@/app/providers/ClientProviders";

// Load fonts in server component
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

// Get base URL for metadata
const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://reflekt-journal.vercel.app";

// Static metadata that doesn't depend on contexts or hooks
export const metadata: Metadata = {
  title: {
    default: "Reflekt - A Personal Journaling App",
    template: "%s | Reflekt Journal",
  },
  description:
    "Capture your thoughts and gain AI-powered insights with this beautiful journaling app",
  
  // PWA specific metadata
  applicationName: "Reflekt Journal",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Reflekt",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  
  // Icons (favicon, etc)
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    other: [
      {
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  
  metadataBase: new URL(baseUrl),

  // OpenGraph metadata for social sharing
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Reflekt Journal",
    title: "Reflekt - A Personal Journaling App",
    description:
      "Capture your thoughts and gain AI-powered insights with this beautiful journaling app",
    images: [
      {
        url: new URL('/opengraph-image.jpg', baseUrl).toString(),
        width: 1200,
        height: 630,
        alt: "Reflekt Journal App",
        type: "image/jpeg",
      },
    ],
  },

  // Twitter/X card metadata
  twitter: {
    card: "summary_large_image",
    title: "Reflekt Journal",
    description: "Your personal journaling space with AI-powered insights",
    images: [new URL('/opengraph-image.jpg', baseUrl).toString()],
  },

  keywords: [
    "journal",
    "journaling",
    "reflection",
    "AI",
    "insights",
    "personal growth",
  ],
  authors: [{ name: "Eric Gitangul" }],
};

// Separate viewport configuration
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4f46e5", // Match theme color from manifest
  // Add the following for better PWA support
  minimumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={montserrat.variable}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}