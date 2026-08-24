/**
 * Service-role Supabase client — the deliberate RLS bypass.
 *
 * Tasks legitimately need it: they run with no user session and still have to
 * write storage and rows. The point of this wrapper is not to forbid that, but
 * to make *who bypasses RLS, and why* a query rather than an archaeology
 * exercise. Every acquisition names a reason and is logged.
 *
 * See docs/DECISIONS.md ADR 0001.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  SERVICE_ROLE_ENV_MISSING,
  SERVICE_ROLE_LOG,
  type ServiceRoleReason,
} from '@/shared/persistence/constants/admin'

export { ServiceRoleReason } from '@/shared/persistence/constants/admin'

/** Acquire the service-role client for a stated reason. */
export function serviceRoleClient(reason: ServiceRoleReason): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // No anon-key fallback: this client exists to bypass RLS, so a missing key is
  // a configuration error, not something to silently degrade.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) throw new Error(SERVICE_ROLE_ENV_MISSING)

  console.info(`${SERVICE_ROLE_LOG.ACQUIRED} ${reason}`)
  return createClient(url, key)
}
