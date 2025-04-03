import { EntryInsight } from '@/types/insights';

// Storage key prefix
const CACHE_KEY_PREFIX = 'insights_cache_';

/**
 * Interface for cached insight data with metadata
 */
interface CachedInsight extends EntryInsight {
  _timestamp: number;
  _expiresAt: number;
}

/**
 * Cache insights data for offline use
 * @param entryId The entry ID associated with the insights
 * @param data The insights data to cache
 * @param ttl Time to live in milliseconds (default: 24 hours)
 */
export async function cacheInsights(
  entryId: string, 
  data?: any, 
  ttl = 24 * 60 * 60 * 1000
): Promise<CachedInsight | null> {
  const cacheKey = `${CACHE_KEY_PREFIX}${entryId}`;
  
  // If no data provided, retrieve from cache
  if (!data) {
    return retrieveFromCache(entryId);
  }
  
  // Add timestamp and expiration metadata
  const timestamp = Date.now();
  const cachedData: CachedInsight = {
    ...data,
    _timestamp: timestamp,
    _expiresAt: timestamp + ttl,
  };
  
  // Use localStorage in client environment
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
      return cachedData;
    } catch (error) {
      console.error('Failed to cache insights:', error);
      return null;
    }
  }
  
  return null;
}

/**
 * Retrieve cached insights for an entry
 * @param entryId The entry ID to retrieve insights for
 * @returns The cached insights or null if not found/expired
 */
export async function retrieveFromCache(entryId: string): Promise<CachedInsight | null> {
  const cacheKey = `${CACHE_KEY_PREFIX}${entryId}`;
  
  // Check client environment
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const cachedItem = localStorage.getItem(cacheKey);
    
    if (!cachedItem) {
      return null;
    }
    
    const cachedData = JSON.parse(cachedItem) as CachedInsight;
    
    // Check if cache has expired
    if (cachedData._expiresAt < Date.now()) {
      // Remove expired cache
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return cachedData;
  } catch (error) {
    console.error('Error retrieving from cache:', error);
    return null;
  }
}

/**
 * Clear all cached insights
 */
export function clearInsightsCache(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing insights cache:', error);
  }
}

/**
 * Clear cached insights for a specific entry
 * @param entryId The entry ID to clear cache for
 */
export function clearEntryInsightsCache(entryId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${entryId}`;
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error('Error clearing entry insights cache:', error);
  }
} 