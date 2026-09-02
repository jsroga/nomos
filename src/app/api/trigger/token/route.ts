/**
 * Generate public access tokens for Trigger.dev realtime subscriptions
 * This enables frontend components to subscribe to run updates without polling
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@trigger.dev/sdk'
import { API_ERROR, API_LOG_PREFIX, TRIGGER_TOKEN_EXPIRY } from '@/shared/data/constants/api-errors'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { JobAccessError, retrieveOwnedRun } from '@/shared/jobs/owned-run'
import { HttpStatus } from '@/shared/data/constants/protocol'

const TriggerTokenBodySchema = z.object({
  runIds: z.array(z.string().min(1)).min(1),
})

export const POST = withAuth(async (req: NextRequest, { session }: AuthenticatedRequest) => {
  try {
    const body = TriggerTokenBodySchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: API_ERROR.RUN_IDS_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
    }

    const ids = body.data.runIds

    await Promise.all(ids.map(runId => retrieveOwnedRun(runId, session.user.id)))

    const publicToken = await auth.createPublicToken({
      scopes: {
        read: {
          runs: ids,
        },
      },
      expirationTime: TRIGGER_TOKEN_EXPIRY,
    })

    return NextResponse.json({ token: publicToken })
  } catch (error) {
    if (error instanceof JobAccessError) {
      return NextResponse.json({ error: API_ERROR.RUN_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
    }
    console.error(API_LOG_PREFIX.TRIGGER_TOKEN_ERROR, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : API_ERROR.FAILED_GENERATE_TOKEN },
      { status: HttpStatus.INTERNAL }
    )
  }
})
