import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null
function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('supabaseUrl is required.')
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
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getClient() as Record<string | symbol, unknown>)[prop]
  },
})
