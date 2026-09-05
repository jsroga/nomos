/**
 * Module-level fetch cache to prevent duplicate API calls
 * even when React components remount.
 */

const DEFAULT_TTL_MS = 30_000

interface CacheEntry {
  promise?: Promise<unknown>
  data?: unknown
  timestamp: number
}

const fetchCache = new Map<string, CacheEntry>()

/**
 * Fetches data with automatic deduplication.
 * If the same key is requested within the TTL window, returns cached data.
 * If a fetch is in-flight, returns the same promise (dedupes concurrent requests).
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttlMs?: number
    validate: (value: unknown) => value is T
  }
): Promise<T> {
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS
  const now = Date.now()
  const cached = fetchCache.get(key) ?? { timestamp: 0 }
  fetchCache.set(key, cached)

  if (cached.data !== undefined && now - cached.timestamp < ttl && options.validate(cached.data)) {
    return cached.data
  }

  if (cached.promise) {
    const result = await cached.promise
    if (options.validate(result)) {
      return result
    }
  }

  const promise = (async () => {
    try {
      const data = await fetcher()
      const entry = fetchCache.get(key)
      if (entry) {
        entry.data = data
        entry.timestamp = Date.now()
        entry.promise = undefined
      }
      return data
    } catch (err) {
      fetchCache.delete(key)
      throw err
    }
  })()

  cached.promise = promise
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
