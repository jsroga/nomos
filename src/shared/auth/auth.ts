import { cookies, headers } from 'next/headers'

import { Session } from '@supabase/supabase-js'
import { createSupabaseRouteClient } from '@/shared/auth/supabase-route-client'
import {
  E2E_AUTH_ROLE,
  E2E_MOCK_ACCESS_TOKEN,
  E2E_MOCK_REFRESH_TOKEN,
  E2E_MOCK_USER_EMAIL,
  E2E_MOCK_USER_ID,
  E2E_TOKEN_TYPE,
} from '@/shared/auth/constants/e2e-auth'
import {
  ApiErrorMessage,
  EnvVarName,
  HttpHeader,
  NodeEnv,
} from '@/shared/data/constants/protocol'

const DEV_MOCK_SESSION: Session = {
  user: {
    id: E2E_MOCK_USER_ID,
    email: E2E_MOCK_USER_EMAIL,
    app_metadata: {},
    user_metadata: {},
    aud: E2E_AUTH_ROLE,
    created_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    role: E2E_AUTH_ROLE,
    updated_at: new Date().toISOString(),
  },
  access_token: E2E_MOCK_ACCESS_TOKEN,
  token_type: E2E_TOKEN_TYPE,
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: E2E_MOCK_REFRESH_TOKEN,
}

export async function getUserSession() {
  if (
    process.env.NODE_ENV === NodeEnv.Development ||
    process.env.NODE_ENV === NodeEnv.Test
  ) {
    const headersList = await headers()
    const e2eHeader = headersList.get(HttpHeader.BYPASS_AUTH)
    const bypassSecret = process.env[EnvVarName.E2eBypassAuthSecret]
    if (bypassSecret && e2eHeader === bypassSecret) {
      return { session: DEV_MOCK_SESSION, supabase: null, error: null }
    }
  }

  const cookieStore = await cookies()
  const supabase = createSupabaseRouteClient(cookieStore)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { session: null, supabase, error: error ?? new Error(ApiErrorMessage.UNAUTHORIZED) }
  }

  const session: Session = {
    user,
    access_token: '',
    refresh_token: '',
    token_type: E2E_TOKEN_TYPE,
    expires_in: 0,
    expires_at: 0,
  }

  return { session, supabase, error: null }
}

export async function requireAuth() {
  const { session, supabase, error } = await getUserSession()

  if (error || !session) {
    return {
      session: null,
      supabase,
      error: error || new Error(ApiErrorMessage.UNAUTHORIZED),
    }
  }

  return { session, supabase, error: null }
}
