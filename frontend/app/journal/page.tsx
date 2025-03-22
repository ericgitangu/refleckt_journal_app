import Link from 'next/link';
import { ThemeToggleClient } from '@/components/theme/theme-toggle-client';
import { ChevronLeft } from 'lucide-react';
import { JournalEntryFeed } from '@/components/journal/journal-entry-feed';
import { CreateEntryButton } from '@/components/journal/create-entry-button';
import { Suspense } from 'react';
import { LoadingFeed } from '@/components/journal/loading-feed';


export const metadata = {
  title: 'Journal - Reflekt',
  description: 'Your personal journal entries',
};

export default function JournalPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center text-muted-foreground hover:text-foreground transition">
              <ChevronLeft className="h-4 w-4" />
              <span>Home</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <CreateEntryButton />
            <ThemeToggleClient />
          </div>
        </div>

        <h1 className="font-serif text-3xl font-bold mb-6">My Journal</h1>

        <Suspense fallback={<LoadingFeed />}>
          <JournalEntryFeed />
        </Suspense>
      </div>
    </div>
  );
} 