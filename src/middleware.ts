import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  // Redirect logged-in users away from login page to /app ONLY if they are authorized
  if (path === '/login' && session) {
    const adminEmail = process.env.ADMIN_EMAIL || 'jaceksroga@gmail.com'
    if (session.user.email === adminEmail) {
      return NextResponse.redirect(new URL('/app', req.url))
    }
  }

  // Allow public routes
  if (path === '/' || path === '/login' || path.startsWith('/auth/') || path.startsWith('/api/') || path.startsWith('/_next/') || path.startsWith('/assets/')) {
    return res
  }

  // Protect /app routes
  if (path.startsWith('/app')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'jaceksroga@gmail.com'
    if (session.user.email !== adminEmail) {
      // If not admin, redirect to root with error or just root
      // Or a specific "Access Denied" page?
      // For now, redirect to / with query param
      const url = new URL('/', req.url)
      // url.searchParams.set('error', 'access_denied')
      return NextResponse.redirect(url)
    }
  }

  // Default protection for other routes (if any)
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth
     * - login (handled inside middleware but excluded from broad matcher to avoid loops if needed, but here we include it mentally or use negative lookahead)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth|assets|.*\\.png$).*)',
  ],
}
