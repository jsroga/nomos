/**
 * API Keys Management Endpoint
 *
 * Allows users to create and manage their MCP API keys.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/lib/api-utils'
import { generateApiKey, hashApiKey } from '@/mcp/core/auth'

// Schema for creating API keys
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).optional().default(['*']),
  expiresAt: z.string().datetime().optional(),
})

/**
 * GET /api/api-keys
 * List user's API keys (without revealing the actual keys)
 */
export const GET = withAuth(
  async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, scopes, created_at, last_used_at, revoked_at, expires_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API Keys] Error fetching keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    return NextResponse.json({ apiKeys: data })
  }
)

/**
 * POST /api/api-keys
 * Create a new API key
 * Returns the plain text key ONCE - it cannot be retrieved again
 */
export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const body = await request.json()

    try {
      const validated = createApiKeySchema.parse(body)

      // Generate new API key
      const plainKey = generateApiKey()
      const keyHash = await hashApiKey(plainKey)

      // Store hashed key in database
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: session.user.id,
          key_hash: keyHash,
          name: validated.name,
          scopes: validated.scopes,
          expires_at: validated.expiresAt,
        })
        .select('id, name, scopes, created_at, expires_at')
        .single()

      if (error) {
        console.error('[API Keys] Error creating key:', error)
        return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
      }

      // Return the plain text key - this is the ONLY time it will be shown
      return NextResponse.json(
        {
          apiKey: {
            ...data,
            key: plainKey, // Plain text key - save it now!
          },
          message: 'Save this key now. It cannot be retrieved again.',
        },
        { status: 201 }
      )
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }
  }),
  { maxRequests: 10, windowMs: 60000 } // 10 key creations per minute
)

/**
 * DELETE /api/api-keys
 * Revoke an API key
 */
export const DELETE = withAuth(
  async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 })
    }

    // Revoke by setting revoked_at timestamp (soft delete)
    const { error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('user_id', session.user.id) // Ensure user owns the key

    if (error) {
      console.error('[API Keys] Error revoking key:', error)
      return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'API key revoked' })
  }
)
