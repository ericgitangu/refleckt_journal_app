import { Metadata } from 'next';

export interface GenerateMetadataProps {
  title: string;
  description?: string;
  type?: 'website' | 'article';
  date?: string;
  ogImage?: string;
}

/**
 * Generate metadata for Next.js pages including OpenGraph
 * Optimized for social media sharing including WhatsApp
 */
export function generateMetadata({
  title,
  description,
  type = 'website',
  date,
  ogImage,
}: GenerateMetadataProps): Metadata {
  // Get base URL for absolute URLs in metadata
  // Remove trailing slash to avoid double slashes in paths
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://self-reflektions.vercel.app')).replace(/\/$/, '');
    
  // Default OG image if none provided - use the actual image filename
  const defaultOgImage = `${baseUrl}/og-image.jpg`;
  const ogImageUrl = ogImage || defaultOgImage;

  // The full title with site name suffix
  const fullTitle = `${title} | Reflekt Journal`;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      type,
      ...(date && { publishedTime: date }),
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      // Adding site_name helps with WhatsApp preview
      siteName: 'Reflekt Journal',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImageUrl],
      // Adding creator helps with Twitter preview
      creator: '@reflektjournal',
    },
    // Adding these properties helps with broader compatibility
    applicationName: 'Reflekt Journal',
    referrer: 'origin-when-cross-origin',
    keywords: ['journal', 'reflection', 'personal', 'ai', 'insights', type],
    authors: [{ name: 'Reflekt Journal', url: baseUrl }],
    // Setting robots to ensure crawlers can access your OG content
    robots: {
      index: true,
      follow: true,
    },
  };
} 