/**
 * Module-level fetch cache to prevent duplicate API calls
 * even when React components remount.
 *
 * This is specifically designed to solve infinite fetch loops
 * caused by components unmounting/remounting.
 */

interface CacheEntry {
  promise: Promise<any>
  timestamp: number
  data?: any
}

// Module-level cache that persists across component mounts
const fetchCache = new Map<string, CacheEntry>()

// Default TTL: 30 seconds (prevents re-fetching too quickly)
const DEFAULT_TTL_MS = 30_000

/**
 * Fetches data with automatic deduplication.
 * If the same key is requested within the TTL window, returns cached data.
 * If a fetch is in-flight, returns the same promise (dedupes concurrent requests).
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number }
): Promise<T> {
  const ttl = options?.ttlMs ?? DEFAULT_TTL_MS
  const now = Date.now()

  const cached = fetchCache.get(key)

  // If we have cached data that's still fresh, return it
  if (cached && cached.data !== undefined && now - cached.timestamp < ttl) {
    return cached.data as T
  }

  // If there's an in-flight request, wait for it
  if (cached && cached.data === undefined) {
    return cached.promise as Promise<T>
  }

  // Create new fetch
  const promise = fetcher()
    .then(data => {
      const entry = fetchCache.get(key)
      if (entry) {
        entry.data = data
      }
      return data
    })
    .catch(err => {
      // On error, clear the cache so next request can retry
      fetchCache.delete(key)
      throw err
    })

  fetchCache.set(key, { promise, timestamp: now })

  return promise
}

/**
 * Clears the cache for a specific key or all keys.
 */
export function clearFetchCache(key?: string): void {
  if (key) {
    fetchCache.delete(key)
  } else {
    fetchCache.clear()
  }
}