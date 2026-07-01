import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const INTERNAL_SECRET = process.env.INTERNAL_DOCS_SECRET

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /docs/internal routes
  if (pathname.startsWith('/docs/internal')) {
    // Fail closed: no secret configured means no access
    if (!INTERNAL_SECRET) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const response = NextResponse.next()
      response.headers.set('x-internal-auth-required', 'true')
      return response
    }
    // Check for auth cookie (set by the login form)
    const authCookie = request.cookies.get('internal_docs_auth')

    // Check for auth header (for API access)
    const authHeader = request.headers.get('x-internal-auth')

    if (authCookie?.value !== INTERNAL_SECRET && authHeader !== INTERNAL_SECRET) {
      // Allow the login page to render (handled by client component)
      // But block API routes
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // For page routes, let the client layout handle the login UI
      // But add a flag so the page knows it's not authenticated server-side
      const response = NextResponse.next()
      response.headers.set('x-internal-auth-required', 'true')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/docs/internal/:path*', '/api/docs/internal/:path*'],
}
