/**
 * URL construction helpers — paths, query params, and Next.js searchParams cloning.
 * Use instead of manual template strings or raw encodeURIComponent at call sites.
 */

export type UrlQueryValue = string | number | boolean | null | undefined

export type UrlQueryParams = Record<string, UrlQueryValue>

/** Percent-encode a single path segment (id, slug, filename, etc.). */
export function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment)
}

/** Join a base path with encoded segments (no duplicate slashes). */
export function joinUrlPath(basePath: string, ...segments: string[]): string {
  const normalizedBase = basePath.replace(/\/+$/, '')
  if (segments.length === 0) {
    return normalizedBase || '/'
  }
  const tail = segments.map(encodePathSegment).join('/')
  if (!normalizedBase) {
    return `/${tail}`
  }
  return `${normalizedBase}/${tail}`
}

function splitPathAndQuery(url: string): [path: string, query: string] {
  const queryIndex = url.indexOf('?')
  if (queryIndex === -1) {
    return [url, '']
  }
  return [url.slice(0, queryIndex), url.slice(queryIndex + 1)]
}

/** Append query params to a URL; skips null/undefined; merges with existing query. */
export function appendQueryParams(url: string, params: UrlQueryParams): string {
  const [path, existingQuery] = splitPathAndQuery(url)
  const search = new URLSearchParams(existingQuery)
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    search.set(key, String(value))
  }
  const queryString = search.toString()
  return queryString ? `${path}?${queryString}` : path
}

/** Build a path with optional query params. */
export function buildUrl(pathname: string, query?: UrlQueryParams): string {
  if (!query) return pathname
  return appendQueryParams(pathname, query)
}

/** Query string only (no leading `?`). */
export function buildQueryString(params: UrlQueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    search.set(key, String(value))
  }
  return search.toString()
}

/** Clone Next.js `searchParams` (or string) for safe mutation. */
export function cloneSearchParams(
  source: URLSearchParams | { toString(): string } | string | null | undefined
): URLSearchParams {
  if (!source) return new URLSearchParams()
  if (typeof source === 'string') return new URLSearchParams(source)
  return new URLSearchParams(source.toString())
}

/** Attach serialized search params to a pathname (router.push/replace). */
export function buildPathWithSearchParams(pathname: string, params: URLSearchParams): string {
  const queryString = params.toString()
  return queryString ? `${pathname}?${queryString}` : pathname
}
