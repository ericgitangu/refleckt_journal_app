import { useState, useEffect } from 'react';
import { EntryInsight } from '@/types/insights';
import { aiApi } from '@/lib/api';
import { retrieveFromCache, cacheInsights } from '@/lib/offline/insights-cache';

interface UseAIInsightsOptions {
  skipCache?: boolean;
  onError?: (error: Error) => void;
}

interface UseAIInsightsResult {
  insights: EntryInsight | null;
  loading: boolean;
  error: Error | null;
  isFromCache: boolean;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching and caching AI insights for an entry
 */
export function useAIInsights(
  entryId: string | null | undefined,
  options: UseAIInsightsOptions = {}
): UseAIInsightsResult {
  const [insights, setInsights] = useState<EntryInsight | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);

  const fetchInsights = async (skipCache = options.skipCache) => {
    if (!entryId) {
      setInsights(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to get from cache first (unless skipCache is true)
      if (!skipCache) {
        const cachedData = await retrieveFromCache(entryId);
        if (cachedData) {
          setInsights(cachedData);
          setIsFromCache(true);
          setLoading(false);
          return;
        }
      }

      // Fetch from API
      setIsFromCache(false);
      const data = await aiApi.getEntryInsightsWithFallback(entryId);
      
      if (data) {
        // Ensure data has all required properties before setting state
        if (
          'sentiment' in data && 
          'sentimentScore' in data && 
          'keywords' in data && 
          'suggestedCategories' in data && 
          'provider' in data
        ) {
          setInsights(data as unknown as EntryInsight);
          
          // Cache the insights for future use
          await cacheInsights(entryId, data);
        } else {
          console.error('Received incomplete insights data:', data);
          setError(new Error('Received incomplete insights data from API'));
        }
      } else {
        setInsights(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch insights'));
      
      if (options.onError && err instanceof Error) {
        options.onError(err);
      }
      
      // Try to get from cache as fallback if API fails
      if (!skipCache) {
        try {
          const cachedData = await retrieveFromCache(entryId);
          if (cachedData) {
            setInsights(cachedData);
            setIsFromCache(true);
          }
        } catch (cacheErr) {
          console.error('Cache fallback error:', cacheErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entryId) {
      fetchInsights();
    } else {
      setInsights(null);
      setError(null);
      setLoading(false);
      setIsFromCache(false);
    }
    // We intentionally only want to run this effect when entryId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  return {
    insights,
    loading,
    error,
    isFromCache,
    refetch: () => fetchInsights(true) // Force skip cache on refetch
  };
} 