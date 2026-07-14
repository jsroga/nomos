/**
 * Canonical site origin with trailing slash — used for OAuth redirects and email links.
 *
 * In the browser we always use the current origin so local dev stays on localhost
 * even when NEXT_PUBLIC_VERCEL_URL points at production.
 */
import {
  DEFAULT_DEV_PORT,
  NodeEnv,
  URL_HTTP_PREFIX,
} from '@/shared/data/constants/url'
export function getSiteURL() {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    return origin.endsWith('/') ? origin : `${origin}/`
  }

  let url = process.env.NEXT_PUBLIC_SITE_URL

  // Only fall back to Vercel URL in production builds
  if (!url && process.env.NODE_ENV === NodeEnv.Production) {
    url = process.env.NEXT_PUBLIC_VERCEL_URL
  }

  if (!url) {
    const port = process.env.PORT ?? DEFAULT_DEV_PORT
    url = `http://localhost:${port}`
  }

  url = url.startsWith(URL_HTTP_PREFIX) ? url : `https://${url}`
  return url.endsWith('/') ? url : `${url}/`
}

/** Server-side: prefer the incoming request origin (e.g. route handlers). */
export function getSiteURLFromRequest(requestUrl: string | URL) {
  const origin = new URL(requestUrl).origin
  return origin.endsWith('/') ? origin : `${origin}/`
}
