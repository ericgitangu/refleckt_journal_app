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
 * Generate metadata for this page
 */
export async function generateMetadata({ params }: { params: { id: string } }) {
  const entry = await fetchJournalEntry(params.id);
  
  return genMeta({
    title: entry.title,
    description: entry.content?.substring(0, 160) || undefined,
    date: new Date(entry.created_at).toLocaleDateString(),
    type: 'article'
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
