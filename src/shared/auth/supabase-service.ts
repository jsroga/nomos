import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL_REQUIRED_MESSAGE } from '@/shared/auth/constants/supabase-admin'

/**
 * Fresh service-role Supabase client for background tasks (Trigger.dev).
 *
 * Prefers the service-role key and falls back to the anon key, resolving env
 * explicitly (no non-null assertions) so a missing config fails loud rather
 * than constructing a broken client.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error(SUPABASE_URL_REQUIRED_MESSAGE)
  return createClient(url, key)
}
