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
 */
export async function generateMetadata({ params }: { params: { id: string } }) {
  const entry = await fetchJournalEntry(params.id);
  
  // Get base URL for absolute URLs in metadata
  const baseUrl = "https://self-reflektions.vercel.app/_next/image?url=%2Flogo.jpg&w=64&q=75&dpl=dpl_CeMof2aAvKuh89pCWahoAiz8YWxd"
  const contentPreview = entry.content?.substring(0, 160) || undefined;
  
  // Format date for display
  const formattedDate = new Date(entry.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Create OG image URL with query parameters
  const ogImageUrl = new URL(`${baseUrl}/api/og`);
  ogImageUrl.searchParams.append('title', entry.title);
  ogImageUrl.searchParams.append('date', formattedDate);
  if (contentPreview) {
    ogImageUrl.searchParams.append('content', contentPreview);
  }
  
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
