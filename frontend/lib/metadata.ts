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
 */
export function generateMetadata({
  title,
  description,
  type = 'website',
  date,
  ogImage,
}: GenerateMetadataProps): Metadata {
  // Get base URL for absolute URLs in metadata
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
  // Default OG image if none provided
  const defaultOgImage = `${baseUrl}/og-image.jpg`;
  const ogImageUrl = ogImage || defaultOgImage;

  return {
    title,
    description,
    openGraph: {
      title,
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
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
} 