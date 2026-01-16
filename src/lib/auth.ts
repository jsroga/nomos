import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function getUserSession() {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  return { session, supabase, error }
}

export async function requireAuth() {
  const { session, error } = await getUserSession()

  if (error || !session) {
    return { session: null, error: error || new Error('Unauthorized') }
  }

  return { session, error: null }
}
