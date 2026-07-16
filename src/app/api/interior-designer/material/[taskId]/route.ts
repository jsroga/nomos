import { runs } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import {
  interiorMaterialStatusResponseSchema,
  interiorTaskParamsSchema,
} from '@/domains/interior-designer/core/io/interior-designer.dto'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { getErrorMessage } from '@/shared/errors/error-utils'

// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const parsedParams = interiorTaskParamsSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json({ error: parsedParams.error.issues[0]?.message }, { status: 400 })
    }

    const { taskId } = parsedParams.data

    const run = await runs.retrieve(taskId)

    return NextResponse.json(
      interiorMaterialStatusResponseSchema.parse({
        status: run.status,
        output: run.output,
        error: run.error,
        metadata: run.metadata,
      })
    )
  } catch (error: unknown) {
    console.error(API_LOG_PREFIX.SURFACE_MATERIAL_STATUS_FAILED, error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
