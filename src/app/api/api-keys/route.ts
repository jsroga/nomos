/**
 * API Keys Management Endpoint
 *
 * Allows users to create and manage their MCP API keys.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { generateApiKey, hashApiKey } from '@/mcp/core/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_SELECT, DB_TABLE } from '@/shared/data/constants/db-tables'
import { QueryParam } from '@/shared/data/constants/protocol'
import { createApiKeyRequestSchema } from '@/shared/openapi/schemas/api-keys'

/**
 * GET /api/api-keys
 * List user's API keys (without revealing the actual keys)
 */
export const GET = withAuth(
  async (_request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { data, error } = await supabase
      .from(DB_TABLE.API_KEYS)
      .select(DB_SELECT.API_KEY_LIST)
      .eq(DB_COLUMN.USER_ID, session.user.id)
      .order(DB_COLUMN.CREATED_AT, { ascending: false })

    if (error) {
      console.error(API_LOG_PREFIX.API_KEYS_FETCH_ERROR, error)
      return NextResponse.json({ error: API_ERROR.FAILED_FETCH_API_KEYS }, { status: 500 })
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
      const validated = createApiKeyRequestSchema.parse(body)

      const plainKey = generateApiKey()
      const keyHash = await hashApiKey(plainKey)

      const { data, error } = await supabase
        .from(DB_TABLE.API_KEYS)
        .insert({
          [DB_COLUMN.USER_ID]: session.user.id,
          [DB_COLUMN.KEY_HASH]: keyHash,
          [DB_COLUMN.NAME]: validated.name,
          [DB_COLUMN.SCOPES]: validated.scopes,
          [DB_COLUMN.EXPIRES_AT]: validated.expiresAt,
        })
        .select(DB_SELECT.API_KEY_CREATE)
        .single()

      if (error) {
        console.error(API_LOG_PREFIX.API_KEYS_CREATE_ERROR, error)
        return NextResponse.json({ error: API_ERROR.FAILED_CREATE_API_KEY }, { status: 500 })
      }

      return NextResponse.json(
        {
          apiKey: {
            ...data,
            key: plainKey,
          },
          message: API_ERROR.API_KEY_SAVE_NOW,
        },
        { status: 201 }
      )
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: API_ERROR.INVALID_REQUEST, details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }
  }),
  { maxRequests: 10, windowMs: 60000 }
)

/**
 * DELETE /api/api-keys
 * Revoke an API key
 */
export const DELETE = withAuth(
  async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get(QueryParam.Id)

    if (!keyId) {
      return NextResponse.json({ error: API_ERROR.API_KEY_ID_REQUIRED }, { status: 400 })
    }

    const { error } = await supabase
      .from(DB_TABLE.API_KEYS)
      .update({ [DB_COLUMN.REVOKED_AT]: new Date().toISOString() })
      .eq(DB_COLUMN.ID, keyId)
      .eq(DB_COLUMN.USER_ID, session.user.id)

    if (error) {
      console.error(API_LOG_PREFIX.API_KEYS_REVOKE_ERROR, error)
      return NextResponse.json({ error: API_ERROR.FAILED_REVOKE_API_KEY }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: API_ERROR.API_KEY_REVOKED })
  }
)
