/**
 * Canonical site origin with trailing slash — used for OAuth redirects and email links.
 *
 * In the browser we always use the current origin so local dev stays on localhost
 * even when NEXT_PUBLIC_VERCEL_URL points at production.
 */
export function getSiteURL() {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    return origin.endsWith('/') ? origin : `${origin}/`
  }

  let url = process.env.NEXT_PUBLIC_SITE_URL

  // Only fall back to Vercel URL in production builds
  if (!url && process.env.NODE_ENV === 'production') {
    url = process.env.NEXT_PUBLIC_VERCEL_URL
  }

  if (!url) {
    const port = process.env.PORT ?? '4000'
    url = `http://localhost:${port}`
  }

  url = url.startsWith('http') ? url : `https://${url}`
  return url.endsWith('/') ? url : `${url}/`
}

/** Server-side: prefer the incoming request origin (e.g. route handlers). */
export function getSiteURLFromRequest(requestUrl: string | URL) {
  const origin = new URL(requestUrl).origin
  return origin.endsWith('/') ? origin : `${origin}/`
}
