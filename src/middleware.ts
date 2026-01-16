import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Allowed origins for CSRF protection
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[]

/**
 * Validate request origin for CSRF protection
 */
function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')

  // Allow requests without origin (same-origin navigation, GET requests)
  if (!origin && !referer) {
    return true
  }

  // Check origin header
  if (origin) {
    return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))
  }

  // Fallback to referer
  if (referer) {
    return ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed))
  }

  return false
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const method = req.method

  // CSRF Protection for state-changing API requests
  if (path.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    // Skip CSRF for certain public endpoints (webhooks, etc.)
    const publicApiPaths = ['/api/waitlist', '/api/auth/']
    const isPublicApi = publicApiPaths.some(p => path.startsWith(p))

    if (!isPublicApi && !validateOrigin(req)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Invalid request origin' },
        { status: 403 }
      )
    }
  }

  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Redirect logged-in users away from login page to /app
  if (path === '/login' && session) {
    return NextResponse.redirect(new URL('/app', req.url))
  }

  // Allow public routes
  if (
    path === '/' ||
    path === '/login' ||
    path === '/docs' ||
    path === '/api-docs' ||
    path === '/openapi.json' ||
    path.startsWith('/auth/') ||
    path.startsWith('/api/') ||
    path.startsWith('/_next/') ||
    path.startsWith('/assets/') ||
    path.startsWith('/scripts/')
  ) {
    return res
  }

  // Protect /app routes
  if (path.startsWith('/app')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
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
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Note: We now include /api/ in the matcher for CSRF protection
     */
    '/((?!_next/static|_next/image|favicon.ico|assets|.*\\.png$).*)',
  ],
}
