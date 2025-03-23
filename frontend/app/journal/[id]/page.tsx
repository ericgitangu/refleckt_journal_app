import { generateMetadata as genMeta } from '@/lib/metadata';
import { entriesApi } from '@/lib/api';
import { JournalEntry } from '@/hooks/use-journal-entries';
import { notFound } from 'next/navigation';
import { TrueErrorBoundary } from '@/components/ui/react-error-boundary';

/**
 * Tell Next.js this is a dynamic route that should not be statically generated
 */
export const dynamic = 'force-dynamic';

/**
 * Fetch a single journal entry by ID
 */
async function fetchJournalEntry(id: string): Promise<JournalEntry> {
  try {
    const entry = await entriesApi.getById(id);
    return entry;
  } catch (error) {
    console.error(`Error fetching journal entry ${id}:`, error);
    throw notFound();
  }
}

/**
 * Generate metadata for this page including OG images for social sharing
 * Optimized for WhatsApp and other social media platforms
 */
export async function generateMetadata({ params }: { params: { id: string } }) {
  const entry = await fetchJournalEntry(params.id);
  
  // Get base URL for absolute URLs in metadata
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://self-reflektions.vercel.app')).replace(/\/$/, '');
  
  // Generate content preview for OG image - shorter for better WhatsApp display
  const contentPreview = entry.content?.substring(0, 120) || undefined;
  
  // Format date for display
  const formattedDate = new Date(entry.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Create OG image URL with query parameters
  // Using direct path to API route - no _next rewriting
  // Encode parameters to ensure they're valid in URLs
  const ogImageUrl = new URL('/api/og', baseUrl);
  ogImageUrl.searchParams.append('title', encodeURIComponent(entry.title));
  ogImageUrl.searchParams.append('date', encodeURIComponent(formattedDate));
  if (contentPreview) {
    ogImageUrl.searchParams.append('content', encodeURIComponent(contentPreview));
  }
  
  // Add a cache busting parameter to ensure fresh images
  ogImageUrl.searchParams.append('v', new Date().getTime().toString().slice(0, 6));
  
  return genMeta({
    title: entry.title,
    description: contentPreview,
    date: formattedDate,
    type: 'article',
    ogImage: ogImageUrl.toString()
  });
}

export default async function JournalEntryPage({ params }: { params: { id: string } }) {
  const entry = await fetchJournalEntry(params.id);
  
  // Render your journal entry page here
  return (
    <TrueErrorBoundary
      fallbackUI="full"
      title="Something went wrong"
      showDetails={true}
    >
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold">{entry.title}</h1>
      <p className="text-gray-500 mt-2">
        {new Date(entry.created_at).toLocaleDateString()}
      </p>
      <div className="mt-6 prose dark:prose-invert">
        {entry.content.split('\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
    </TrueErrorBoundary>
  );
}
