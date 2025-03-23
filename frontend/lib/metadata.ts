import { Metadata } from 'next';

export interface GenerateMetadataProps {
  title?: string;
  description?: string;
  date?: string;
  type?: 'website' | 'article';
}

/**
 * Helper function to generate consistent metadata for pages
 * Compatible with Next.js App Router metadata API
 */
export function generateMetadata({
  title,
  description,
  date,
  type = 'website'
}: GenerateMetadataProps): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                 (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  
  const pageTitle = title 
    ? `${title} | Reflekt Journal`
    : 'Reflekt - A Personal Journaling App';
  
  const pageDescription = description || 'Reflect on your thoughts with AI-powered insights';
  
  // Use dynamic OG image if title and date are provided
  const ogImageUrl = title && date
    ? `${baseUrl}/api/og?title=${encodeURIComponent(title)}&date=${encodeURIComponent(date)}`
    : `${baseUrl}/og-image.jpg`;

  return {
    title: pageTitle,
    description: pageDescription,
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title || 'Reflekt Journal App',
        }
      ],
      locale: 'en_US',
      type,
      siteName: 'Reflekt Journal',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      images: [ogImageUrl],
      creator: '@reflektapp',
    },
  };
} 