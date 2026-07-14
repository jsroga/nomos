/**
 * API Utilities - Authentication, Rate Limiting, CSRF Protection
 *
 * Provides middleware-like utilities for API routes
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX, RATE_LIMIT } from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_TABLE } from '@/shared/data/constants/db-tables'

// Re-exported so existing `@/shared/data/api-utils` importers keep working.
// Canonical implementation (incl. E2E bypass) lives in @/shared/auth/auth.
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
  supabase: SupabaseClient
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
    return { session: null, supabase: null, error: error || new Error(API_ERROR.UNAUTHORIZED) }
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
// NoInfer: T comes from an explicit type argument (or defaults to unknown) —
// inferring it from the handler picks the first member of union returns like
// NextResponse<A> | NextResponse<B> and then rejects the rest.
export function withAuth<T = unknown>(handler: ApiHandler<NoInfer<T>>) {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const { session, supabase, error } = await getUserSession()

    if (error || !session) {
      return NextResponse.json(
        { error: API_ERROR.UNAUTHORIZED, message: API_ERROR.AUTH_REQUIRED },
        { status: 401 }
      )
    }

    // A valid session with no client is only the dev/test E2E-bypass path
    // (getUserSession returns supabase: null there) — DB-backed handlers can't
    // run without a client, so fail closed rather than expose a nullable type.
    if (!supabase) {
      return NextResponse.json(
        { error: API_ERROR.INTERNAL_SERVER_ERROR, message: API_ERROR.UNKNOWN_ERROR },
        { status: 500 }
      )
    }

    try {
      return await handler(request, { session, supabase }, context)
    } catch (err) {
      console.error(API_LOG_PREFIX.API_ERROR, err)
      return NextResponse.json(
        {
          error: API_ERROR.INTERNAL_SERVER_ERROR,
          message: err instanceof Error ? err.message : API_ERROR.UNKNOWN_ERROR,
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
  const { windowMs = 60000, maxRequests = 60, keyPrefix = RATE_LIMIT.KEY_PREFIX } = config
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
  handler: (
    request: NextRequest,
    context?: { params: Record<string, string> }
  ) => Promise<NextResponse<NoInfer<T>>>,
  config: RateLimitConfig & { getKey?: (request: NextRequest) => string } = {}
) {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const {
      // NextRequest has no `ip` in Next 15 — the proxy header is the source.
      getKey = req => req.headers.get(RATE_LIMIT.FORWARDED_FOR_HEADER) || RATE_LIMIT.ANONYMOUS_KEY,
      ...rateLimitConfig
    } = config
    const key = getKey(request)
    const { allowed, remaining, resetAt } = checkRateLimit(key, rateLimitConfig)

    if (!allowed) {
      return NextResponse.json(
        { error: API_ERROR.TOO_MANY_REQUESTS, message: API_ERROR.RATE_LIMIT_EXCEEDED },
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
    response.headers.set(RATE_LIMIT.REMAINING_HEADER, String(remaining))
    response.headers.set(RATE_LIMIT.RESET_HEADER, String(Math.ceil(resetAt / 1000)))

    return response
  }
}

// ============================================
// PROJECT ACCESS VERIFICATION
// ============================================

/**
 * Verify user has access to a project
 * Uses authenticated Supabase client (RLS enforced)
 */
export async function verifyProjectAccess(
  supabase: SupabaseClient,
  projectId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from(DB_TABLE.PROJECTS)
    .select(DB_COLUMN.ID)
    .eq(DB_COLUMN.ID, projectId)
    .single()

  return !error && !!data
}
