/**
 * API Utilities - Authentication, Rate Limiting, CSRF Protection
 *
 * Provides middleware-like utilities for API routes
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from './auth'

// Re-exported so existing `@/lib/api-utils` importers keep working.
// Canonical implementation (incl. E2E bypass) lives in ./auth.
export { getUserSession }

// ============================================
// TYPES
// ============================================

export interface AuthenticatedRequest {
  session: {
    user: {
      id: string
      email?: string
    }
  }
  supabase: ReturnType<typeof createRouteHandlerClient>
}

export type ApiHandler<T = unknown> = (
  request: NextRequest,
  auth: AuthenticatedRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse<T>>

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Require authentication - returns session or throws
 */
export async function requireAuth() {
  const { session, supabase, error } = await getUserSession()

  if (error || !session) {
    return { session: null, supabase: null, error: error || new Error('Unauthorized') }
  }

  return { session, supabase, error: null }
}

/**
 * Wrapper for authenticated API routes
 * Usage:
 * export const POST = withAuth(async (request, { session, supabase }) => {
 *   // Your handler logic here
 *   return NextResponse.json({ userId: session.user.id })
 * })
 */
export function withAuth<T = unknown>(handler: ApiHandler<T>) {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const { session, supabase, error } = await getUserSession()

    if (error || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    try {
      return await handler(request, { session, supabase }, context)
    } catch (err) {
      console.error('API Error:', err)
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  }
}

// ============================================
// RATE LIMITING
// ============================================

// In-memory rate limit store (for single instance)
// For production, use Redis/Upstash KV
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

interface RateLimitConfig {
  windowMs?: number // Time window in milliseconds (default: 60000 = 1 minute)
  maxRequests?: number // Max requests per window (default: 60)
  keyPrefix?: string // Prefix for rate limit keys
}

/**
 * Check rate limit for a given key
 * Returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = {}
): { allowed: boolean; remaining: number; resetAt: number } {
  const { windowMs = 60000, maxRequests = 60, keyPrefix = 'rl' } = config
  const fullKey = `${keyPrefix}:${key}`
  const now = Date.now()

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) rateLimitStore.delete(k)
    }
  }

  const entry = rateLimitStore.get(fullKey)

  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitStore.set(fullKey, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

/**
 * Rate limiting wrapper for API routes
 */
export function withRateLimit<T = unknown>(
  handler: (request: NextRequest, context?: unknown) => Promise<NextResponse<T>>,
  config: RateLimitConfig & { getKey?: (request: NextRequest) => string } = {}
) {
  return async (request: NextRequest, context?: unknown) => {
    const {
      getKey = req => {
        const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        return forwardedFor || req.headers.get('x-real-ip') || 'anonymous'
      },
      ...rateLimitConfig
    } = config
    const key = getKey(request)
    const { allowed, remaining, resetAt } = checkRateLimit(key, rateLimitConfig)

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    const response = await handler(request, context)

    // Add rate limit headers to successful response
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)))

    return response
  }
}

// ============================================
// CSRF PROTECTION
// ============================================

// ============================================
// PROJECT ACCESS VERIFICATION
// ============================================

/**
 * Verify user has access to a project
 * Uses authenticated Supabase client (RLS enforced)
 */
export async function verifyProjectAccess(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  projectId: string
): Promise<boolean> {
  const { data, error } = await supabase.from('projects').select('id').eq('id', projectId).single()

  return !error && !!data
}
