import { createSupabaseRouteClient } from '@/shared/auth/supabase-route-client'
import {
  AUTH_FLOW_TYPE,
  AUTH_QUERY_PARAM,
  AUTH_ROUTE,
} from '@/shared/auth/constants/auth-messages'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get(AUTH_QUERY_PARAM.CODE)
  const type = requestUrl.searchParams.get(AUTH_QUERY_PARAM.TYPE)

  if (code) {
    const cookieStore = await cookies()
    const supabase = createSupabaseRouteClient(cookieStore)
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to reset-password page for password recovery flow
  if (type === AUTH_FLOW_TYPE.RECOVERY) {
    return NextResponse.redirect(new URL(AUTH_ROUTE.RESET_PASSWORD, request.url))
  }

  return NextResponse.redirect(new URL(AUTH_ROUTE.PROJECTS, request.url))
}
