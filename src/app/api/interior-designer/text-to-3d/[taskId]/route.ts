import { runs } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import {
  interiorTaskParamsSchema,
  interiorTextTo3DStatusResponseSchema,
} from '@/domains/interior-designer/io/interior-designer.dto'
import { requireAuth } from '@/lib/auth'
import { getErrorMessage } from '@/lib/error-utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsedParams = interiorTaskParamsSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json({ error: parsedParams.error.issues[0]?.message }, { status: 400 })
    }

    const { taskId } = parsedParams.data

    const run = await runs.retrieve(taskId)

    return NextResponse.json(
      interiorTextTo3DStatusResponseSchema.parse({
        status: run.status,
        output: run.output,
        error: run.error,
        metadata: run.metadata,
      })
    )
  } catch (error: unknown) {
    console.error('Failed to get text-to-3d run status:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
