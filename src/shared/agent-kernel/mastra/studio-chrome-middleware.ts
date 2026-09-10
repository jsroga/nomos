import type { Middleware } from '@mastra/core/server'
import { matchStudioChromeProbe } from './studio-chrome-probe'

/**
 * Runs before built-in `/api/logs` and `/api/memory/status` Zod.
 * Studio CLI only — production `getMastraInstance()` stays strict.
 */
export const studioChromeMiddleware: Middleware = async (c, next) => {
  const url = new URL(c.req.url)
  const hit = matchStudioChromeProbe({
    method: c.req.method,
    pathname: url.pathname,
    searchParams: url.searchParams,
  })
  if (hit) {
    return c.json(hit.body, hit.status)
  }
  await next()
}
