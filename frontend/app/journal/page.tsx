"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { trpc } from "@/app/hooks/useTRPC";
import { ClientOnly } from "@/components/ClientOnly";
import { TagBadge, MoodBadge } from "@/components/ui/tag-badge";
import { formatCardDate, formatRelativeDate } from "@/lib/date-utils";
import { RefreshCw, Plus, Calendar, Clock, Search, ChevronLeft, ChevronRight, Gift } from "lucide-react";
import { PointsBadge } from "@/components/gamification";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ENTRIES_PER_PAGE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_ENTRIES_PER_PAGE = 10;

// Define the journal entry type
interface JournalEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string | Date;
  created_at?: string;
  mood?: string;
  tags?: string[];
}

// Loading skeleton for entries
function JournalEntrySkeleton() {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-32 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-4/5 mb-4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-18 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// Journal content component with React hooks
function JournalContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(DEFAULT_ENTRIES_PER_PAGE);

  // tRPC query for fallback mock data (only used if REST API fails)
  const {
    data: trpcFallbackData,
    refetch: refetchTrpc,
  } = trpc.getJournalEntries.useQuery(undefined, {
    enabled: false, // Don't auto-fetch, only manual fallback
    retry: false,
  });

  // Primary fetch function - REST API
  const fetchEntries = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const response = await fetch("/api/entries");
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      // Handle both array and {items: []} response formats
      const items = Array.isArray(data) ? data : (data.items || []);
      setEntries(items);
      setError(null);
    } catch (err) {
      console.error("Error fetching from REST API, falling back to tRPC mock data:", err);
      // Fallback to tRPC mock data
      try {
        const result = await refetchTrpc();
        if (result.data) {
          const items = Array.isArray(result.data) ? result.data : (result.data.items || []);
          setEntries(items);
          setError(null);
        } else {
          setError("Failed to load journal entries");
        }
      } catch {
        setError("Failed to load journal entries");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refetchTrpc]);

  // Initial load - fetch from REST API
  useEffect(() => {
    if (status === "authenticated") {
      fetchEntries();
    }
  }, [status, fetchEntries]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    await fetchEntries(true);
  }, [fetchEntries]);

  // Filter entries by search
  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(query) ||
      entry.content.toLowerCase().includes(query) ||
      entry.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

  // Reset to page 1 when search changes or entries per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, entriesPerPage]);

  // Ensure current page is valid when entries change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  // Get date from entry (handles both formats)
  const getEntryDate = (entry: JournalEntry): string => {
    return entry.createdAt?.toString() || entry.created_at || new Date().toISOString();
  };

  if (status === "loading") {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Journal</h1>
          <p className="text-muted-foreground mt-1">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Gamification Badge */}
          <PointsBadge compact />

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh entries"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button asChild>
              <Link href="/journal/new">
                <Plus className="mr-2 h-4 w-4" />
                New Entry
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search entries by title, content, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          <JournalEntrySkeleton />
          <JournalEntrySkeleton />
          <JournalEntrySkeleton />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="text-destructive mb-4">{error}</div>
              <Button onClick={() => fetchEntries(true)} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Icons.bookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Start your journey</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Your journal is empty. Create your first entry to begin capturing your thoughts and reflections.
            </p>
            <Button asChild>
              <Link href="/journal/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Entry
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No search results */}
      {!loading && !error && entries.length > 0 && filteredEntries.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No entries match &ldquo;{searchQuery}&rdquo;
            </p>
            <Button
              variant="link"
              onClick={() => setSearchQuery("")}
              className="mt-2"
            >
              Clear search
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Entries list */}
      {!loading && !error && filteredEntries.length > 0 && (
        <>
          <div className="space-y-4">
            {paginatedEntries.map((entry) => (
              <Card
                key={entry.id}
                className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/20"
                onClick={() => router.push(`/journal/${entry.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-1">
                      {entry.title}
                    </CardTitle>
                    {entry.mood && <MoodBadge mood={entry.mood} size="sm" />}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatCardDate(getEntryDate(entry))}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatRelativeDate(getEntryDate(entry))}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 mb-4">
                    {entry.content}
                  </p>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {entry.tags.map((tag, idx) => (
                        <TagBadge key={idx} tag={tag} size="sm" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t">
              {/* Results info */}
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredEntries.length)} of {filteredEntries.length} entries
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-2">
                {/* Previous button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page, idx) =>
                    page === "ellipsis" ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="h-8 w-8 p-0"
                      >
                        {page}
                      </Button>
                    )
                  )}
                </div>

                {/* Next button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>

              {/* Entries per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Per page:</span>
                <Select
                  value={entriesPerPage.toString()}
                  onValueChange={(value) => setEntriesPerPage(Number(value))}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRIES_PER_PAGE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option.toString()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Page component with ClientOnly wrapper
export default function JournalPage() {
  return (
    <ClientOnly>
      <JournalContent />
    </ClientOnly>
  );
}
