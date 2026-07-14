import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL_REQUIRED_MESSAGE } from '@/shared/auth/constants/supabase-admin'

let _client: SupabaseClient | null = null
function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error(SUPABASE_URL_REQUIRED_MESSAGE)
    _client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _client
}

/** Lazy-initialized so Trigger.dev indexer can import task files without Supabase env at build time. */
export const supabaseAdmin: SupabaseClient = new Proxy(Object.create(null), {
  get(_target, prop) {
    const client = getClient()
    const value = Reflect.get(client, prop, client)
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
