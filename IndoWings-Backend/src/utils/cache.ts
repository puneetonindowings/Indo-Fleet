/**
 * IndoFleet Enterprise High-Performance In-Memory TTL Cache
 * Provides sub-millisecond response times for read-heavy endpoints
 * preventing database connection exhaustion during high-concurrency traffic (10k+ users).
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Get cached item or execute fetcher and store result with TTL
   * @param key Unique cache key
   * @param ttlMs Time-to-live in milliseconds
   * @param fetcher Async function to fetch data if cache misses
   */
  async getOrSet<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const existing = this.cache.get(key);

    if (existing && existing.expiresAt > now) {
      return existing.data as T;
    }

    const freshData = await fetcher();
    this.cache.set(key, {
      data: freshData,
      expiresAt: now + ttlMs
    });

    return freshData;
  }

  /**
   * Invalidate specific key or keys matching prefix
   */
  invalidate(keyOrPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached keys
   */
  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new MemoryCache();
