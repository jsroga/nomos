/**
 * Generate public access tokens for Trigger.dev realtime subscriptions
 * This enables frontend components to subscribe to run updates without polling
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@trigger.dev/sdk/v3'
import { withAuth, type AuthenticatedRequest } from '@/lib/api-utils'

export const POST = withAuth(async (req: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const { runIds } = await req.json()

    if (!runIds || !Array.isArray(runIds) || runIds.length === 0) {
      return NextResponse.json({ error: 'runIds array is required' }, { status: 400 })
    }

    // Generate a public token with read access to the specified runs
    const publicToken = await auth.createPublicToken({
      scopes: {
        read: {
          runs: runIds,
        },
      },
      expirationTime: '1h', // Token valid for 1 hour
    })

    return NextResponse.json({ token: publicToken })
  } catch (error) {
    console.error('Error generating trigger token:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate token' },
      { status: 500 }
    )
  }
})
