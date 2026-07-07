import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies, headers } from 'next/headers'

import { Session } from '@supabase/supabase-js'

// Mock session for E2E tests in development
const DEV_MOCK_SESSION: Session = {
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'e2e-test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    role: 'authenticated',
    updated_at: new Date().toISOString(),
  },
  access_token: 'e2e-mock-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'e2e-mock-refresh',
}

export async function getUserSession() {
  // Check for E2E test bypass in development or test environments
  if (['development', 'test'].includes(process.env.NODE_ENV || '')) {
    const headersList = await headers()
    const e2eHeader = headersList.get('x-bypass-auth')
    if (e2eHeader === 'true') {
      return { session: DEV_MOCK_SESSION, supabase: null as any, error: null }
    }
  }

  /*
   * Next.js 15+ requires awaiting cookies(), but @supabase/auth-helpers-nextjs
   * expects the `cookies` option to return the store synchronously (or it doesn't await it).
   * Since we've already awaited `cookies()` above, we should pass it directly.
   */
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })
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
