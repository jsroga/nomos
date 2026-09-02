import { NextResponse } from 'next/server'
import { z } from 'zod'
import { wait } from '@trigger.dev/sdk'
import { requireAuth } from '@/shared/auth/auth'
import { JobAccessError, retrieveOwnedRun } from '@/shared/jobs/owned-run'
import { RunMetadataKey } from '@/shared/jobs/constants/owned-run'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpStatus } from '@/shared/data/constants/protocol'

const CompleteTokenBodySchema = z.object({
  tokenId: z.string().min(1),
  action: z.string().min(1),
  runId: z.string().min(1),
  variantIndex: z.number(),
})

const WaitTokenMetadataSchema = z.object({
  [RunMetadataKey.WaitTokenId]: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }

    const body = CompleteTokenBodySchema.safeParse(await request.json())
    if (!body.success) {
      return NextResponse.json({ error: API_ERROR.MISSING_REQUIRED_FIELDS }, { status: HttpStatus.BAD_REQUEST })
    }

    const { tokenId, action, runId, variantIndex } = body.data

    const run = await retrieveOwnedRun(runId, session.user.id)
    const metadata = WaitTokenMetadataSchema.safeParse(run.metadata)
    const waitTokenId = metadata.success ? metadata.data[RunMetadataKey.WaitTokenId] : undefined
    if (!waitTokenId || waitTokenId !== tokenId) {
      return NextResponse.json({ error: API_ERROR.RUN_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
    }

    await wait.completeToken(tokenId, { action, variantIndex })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof JobAccessError) {
      return NextResponse.json({ error: API_ERROR.RUN_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
    }
    console.error(API_LOG_PREFIX.COMPLETE_TOKEN_ERROR, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : API_ERROR.FAILED_COMPLETE_TOKEN },
      { status: HttpStatus.INTERNAL }
    )
  }
}
