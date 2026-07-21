import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

export function createSupabaseRouteClient(cookieStore: ReadonlyRequestCookies) {
  // Next 15's cookies() is async, but auth-helpers' adapter calls the accessor
  // synchronously and immediately does `.get()` on the result — an `async`
  // accessor returns a Promise (no `.get`) → "nextCookies.get is not a function".
  // cookieStore is already resolved (callers `await cookies()`), so return it
  // synchronously, matching the working createServerComponentClient pattern.
  // @ts-expect-error - Next 15 async cookies vs auth-helpers' sync accessor type
  return createRouteHandlerClient({ cookies: () => cookieStore })
}
