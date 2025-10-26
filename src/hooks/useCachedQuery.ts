import { useState, useEffect, useCallback } from "react";

interface CachedQueryOptions {
  ttl?: number; // Time to live in seconds (default: 60)
  useLocalStorage?: boolean; // Use localStorage for persistence (default: true)
  onError?: (error: Error) => void;
}

interface CachedQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  isFromCache: boolean;
}

/**
 * Phase 3.10-A: Unified cached query hook
 * 
 * Provides a 3-stage loading pattern:
 * 1. Skeleton (loading = true, data = null)
 * 2. Cache (loading = false, data = cached, isFromCache = true)
 * 3. Live (loading = false, data = fresh, isFromCache = false)
 * 
 * @param key - Unique cache key
 * @param fetcher - Async function to fetch data
 * @param options - Configuration options
 */
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CachedQueryOptions = {}
): CachedQueryResult<T> {
  const {
    ttl = 60,
    useLocalStorage = true,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const getCacheKey = useCallback(() => `cache_${key}`, [key]);
  const getTimestampKey = useCallback(() => `cache_${key}_ts`, [key]);

  const loadFromCache = useCallback((): T | null => {
    if (!useLocalStorage) return null;

    try {
      const cached = localStorage.getItem(getCacheKey());
      const timestamp = localStorage.getItem(getTimestampKey());

      if (!cached || !timestamp) return null;

      const age = (Date.now() - parseInt(timestamp, 10)) / 1000;
      if (age > ttl) {
        // Cache expired
        localStorage.removeItem(getCacheKey());
        localStorage.removeItem(getTimestampKey());
        return null;
      }

      return JSON.parse(cached) as T;
    } catch (err) {
      console.error("[SYS] Cache read error:", err);
      return null;
    }
  }, [getCacheKey, getTimestampKey, ttl, useLocalStorage]);

  const saveToCache = useCallback((value: T) => {
    if (!useLocalStorage) return;

    try {
      localStorage.setItem(getCacheKey(), JSON.stringify(value));
      localStorage.setItem(getTimestampKey(), Date.now().toString());
    } catch (err) {
      console.error("[SYS] Cache write error:", err);
    }
  }, [getCacheKey, getTimestampKey, useLocalStorage]);

  const fetchFresh = useCallback(async () => {
    try {
      const freshData = await fetcher();
      setData(freshData);
      setIsFromCache(false);
      setError(null);
      saveToCache(freshData);
      return freshData;
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetcher, saveToCache, onError]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchFresh();
  }, [fetchFresh]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      // Step 1: Try loading from cache first
      const cached = loadFromCache();
      if (cached && mounted) {
        setData(cached);
        setIsFromCache(true);
        setLoading(false);
      }

      // Step 2: Fetch fresh data in background
      try {
        if (mounted) {
          await fetchFresh();
        }
      } catch (err) {
        // Error already handled in fetchFresh
        if (mounted && !cached) {
          // If no cache and fetch failed, show loading = false
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [key, loadFromCache, fetchFresh]);

  return {
    data,
    loading,
    error,
    refresh,
    isFromCache,
  };
}
