import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

export function createSupabaseRouteClient(cookieStore: ReadonlyRequestCookies) {
  return createRouteHandlerClient({ cookies: () => cookieStore })
}
