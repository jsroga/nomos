import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  LANDING_HERO_AB_COOKIE_MAX_AGE_SEC,
  LandingHeroAbCookie,
  LandingHeroAbHeader,
} from '@/domains/marketing/constants/hero-ab'
import {
  assignHeroAbVariant,
  heroAbWeightsFromEnv,
  parseHeroAbCookieValue,
} from '@/domains/marketing/core/hero-ab'
import { AUTH_QUERY_PARAM } from '@/shared/auth/constants/auth-messages'
import { enforceSiteBasicAuth } from '@/shared/auth/site-basic-auth'
import { denyAnonymousApiRequest } from '@/shared/auth/api-default-deny'

enum LandingProxyPath {
  Home = '/',
  AuthCallback = '/auth/callback',
}

enum CookieSameSite {
  Lax = 'lax',
}

export function proxy(request: NextRequest) {
  const basicAuth = enforceSiteBasicAuth(request)
  if (basicAuth) return basicAuth

  // Default-deny on /api/**: routes are protected before anyone writes one.
  const denied = denyAnonymousApiRequest(request)
  if (denied) return denied

  if (request.nextUrl.pathname !== LandingProxyPath.Home) {
    return NextResponse.next()
  }

  // Supabase Site URL fallback lands OAuth codes on `/` — forward to the exchange route.
  if (request.nextUrl.searchParams.get(AUTH_QUERY_PARAM.CODE)) {
    const callbackUrl = request.nextUrl.clone()
    callbackUrl.pathname = LandingProxyPath.AuthCallback
    return NextResponse.redirect(callbackUrl)
  }

  const existing = parseHeroAbCookieValue(
    request.cookies.get(LandingHeroAbCookie.Name)?.value,
  )
  const variant =
    existing ?? assignHeroAbVariant(heroAbWeightsFromEnv(), Math.random() * 100)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(LandingHeroAbHeader.Name, variant)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  if (existing === null) {
    response.cookies.set(LandingHeroAbCookie.Name, variant, {
      path: LandingProxyPath.Home,
      maxAge: LANDING_HERO_AB_COOKIE_MAX_AGE_SEC,
      sameSite: CookieSameSite.Lax,
      httpOnly: false,
    })
  }

  return response
}

export const config = {
  matcher: [
    // Gate every page + API; skip Next internals and common static assets.
    '/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?)$).*)',
  ],
}
