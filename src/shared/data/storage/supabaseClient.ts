import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Use this for client-side operations that need auth context (RLS)
export const getSupabaseClient = () => createClientComponentClient()

// Re-export for convenience
export { createClientComponentClient }
