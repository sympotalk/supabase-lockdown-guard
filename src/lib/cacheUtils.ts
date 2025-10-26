import { supabase } from "@/integrations/supabase/client";
import { logSys, errorSys } from "./consoleLogger";

/**
 * Phase 3.10-A: Cache utilities
 * Provides centralized cache management with Supabase backend
 */

export interface CacheEntry {
  key: string;
  payload: any;
  updated_at: string;
}

/**
 * Get data from Supabase cache with TTL check
 */
export async function getCachedData<T>(
  key: string,
  ttlSeconds: number = 60
): Promise<T | null> {
  try {
    const { data, error } = await supabase.rpc("get_cached_data" as any, {
      _key: key,
      _ttl_seconds: ttlSeconds,
    });

    if (error) {
      errorSys("Cache read error:", error);
      return null;
    }

    return data as T | null;
  } catch (err) {
    errorSys("Cache fetch error:", err);
    return null;
  }
}

/**
 * Save data to Supabase cache
 */
export async function setCachedData(key: string, payload: any): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("refresh_cache" as any, {
      _key: key,
      _payload: payload,
    });

    if (error) {
      errorSys("Cache write error:", error);
      return false;
    }

    return true;
  } catch (err) {
    errorSys("Cache save error:", err);
    return false;
  }
}

/**
 * Generate scoped cache key
 */
export function generateCacheKey(
  module: string,
  scope?: string | null,
  suffix?: string
): string {
  const parts = [module];
  if (scope) parts.push(scope);
  if (suffix) parts.push(suffix);
  return parts.join(":");
}

/**
 * Clear all cache entries matching a pattern
 */
export async function clearCachePattern(pattern: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("system_cache" as any)
      .delete()
      .like("key", `${pattern}%`);

    if (error) {
      errorSys("Cache clear error:", error);
    }
  } catch (err) {
    errorSys("Cache pattern clear error:", err);
  }
}

/**
 * Prefetch and cache data for common queries
 */
export async function prefetchCommonData(agencyScope?: string | null): Promise<void> {
  const prefetchKeys = [
    generateCacheKey("events", agencyScope),
    generateCacheKey("participants", agencyScope),
    generateCacheKey("insights", agencyScope),
  ];

  logSys("Prefetching cache for keys:", prefetchKeys);
  
  // Prefetch logic can be implemented here
  // For now, this is a placeholder for future optimization
}
