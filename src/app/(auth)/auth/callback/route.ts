import { createSupabaseRouteClient } from '@/shared/auth/supabase-route-client'
import { AUTH_QUERY_PARAM } from '@/shared/auth/constants/auth-messages'
import {
  resolveAuthCallbackRedirect,
  resolveAuthEmailOtpType,
} from '@/shared/auth/utils/auth-callback-next'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function applyAuthCallbackSession(requestUrl: URL): Promise<void> {
  const code = requestUrl.searchParams.get(AUTH_QUERY_PARAM.CODE)
  const tokenHash = requestUrl.searchParams.get(AUTH_QUERY_PARAM.TOKEN_HASH)
  if (!code && !tokenHash) return

  const cookieStore = await cookies()
  const supabase = createSupabaseRouteClient(cookieStore)
  if (tokenHash) {
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: resolveAuthEmailOtpType(requestUrl.searchParams.get(AUTH_QUERY_PARAM.TYPE)),
    })
    return
  }
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get(AUTH_QUERY_PARAM.CODE)
  const tokenHash = requestUrl.searchParams.get(AUTH_QUERY_PARAM.TOKEN_HASH)
  const type = requestUrl.searchParams.get(AUTH_QUERY_PARAM.TYPE)
  const next = requestUrl.searchParams.get(AUTH_QUERY_PARAM.NEXT)

  await applyAuthCallbackSession(requestUrl)

  const destination = resolveAuthCallbackRedirect({
    type,
    next,
    sessionAttempted: Boolean(tokenHash || code),
  })
  return NextResponse.redirect(new URL(destination, request.url))
}
