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

enum LandingMiddlewarePath {
  Home = '/',
}

enum CookieSameSite {
  Lax = 'lax',
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== LandingMiddlewarePath.Home) {
    return NextResponse.next()
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
      path: LandingMiddlewarePath.Home,
      maxAge: LANDING_HERO_AB_COOKIE_MAX_AGE_SEC,
      sameSite: CookieSameSite.Lax,
      httpOnly: false,
    })
  }

  return response
}

export const config = {
  matcher: ['/'],
}
