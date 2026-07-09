import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null
function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('supabaseUrl is required.')
    _client = createClient(url, key)
  }
  return _client
}

function bindClientProperty(client: SupabaseClient, prop: string | symbol): unknown {
  const value = Reflect.get(client, prop, client)
  return typeof value === 'function' ? value.bind(client) : value
}

/** Lazy-initialized so Trigger.dev indexer can import task files without Supabase env at build time. */
export const supabase: SupabaseClient = new Proxy(Object.create(null), {
  get(_target, prop) {
    return bindClientProperty(getClient(), prop)
  },
})
