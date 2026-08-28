/**
 * Generate public access tokens for Trigger.dev realtime subscriptions
 * This enables frontend components to subscribe to run updates without polling
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@trigger.dev/sdk'
import { API_ERROR, API_LOG_PREFIX, TRIGGER_TOKEN_EXPIRY } from '@/shared/data/constants/api-errors'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'

export const POST = withAuth(async (req: NextRequest, _auth: AuthenticatedRequest) => {
    // auth-scope: session-existence-only — issues a Trigger public access token; no tenant resource is read.
  try {
    const { runIds } = await req.json()

    if (!runIds || !Array.isArray(runIds) || runIds.length === 0) {
      return NextResponse.json({ error: API_ERROR.RUN_IDS_REQUIRED }, { status: 400 })
    }

    // Generate a public token with read access to the specified runs
    const publicToken = await auth.createPublicToken({
      scopes: {
        read: {
          runs: runIds,
        },
      },
      expirationTime: TRIGGER_TOKEN_EXPIRY,
    })

    return NextResponse.json({ token: publicToken })
  } catch (error) {
    console.error(API_LOG_PREFIX.TRIGGER_TOKEN_ERROR, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : API_ERROR.FAILED_GENERATE_TOKEN },
      { status: 500 }
    )
  }
})
