import { createSupabaseRouteClient } from '@/shared/auth/supabase-route-client'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createSupabaseRouteClient(cookieStore)
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to reset-password page for password recovery flow
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/auth/reset-password', request.url))
  }

  return NextResponse.redirect(new URL('/projects', request.url))
}
