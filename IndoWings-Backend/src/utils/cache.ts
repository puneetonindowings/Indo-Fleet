interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

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

  invalidate(keyOrPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new MemoryCache();
