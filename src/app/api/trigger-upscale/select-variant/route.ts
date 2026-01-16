import { NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { selectMjVariantTask } from '@/trigger/select-mj-variant'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { tileId, projectId, gridImageUrl, variantIndex } = await request.json()

    if (!tileId || !projectId || !gridImageUrl || !variantIndex) {
      return NextResponse.json(
        { error: 'Missing: tileId, projectId, gridImageUrl, variantIndex' },
        { status: 400 }
      )
    }

    const handle = await tasks.trigger<typeof selectMjVariantTask>(
      'select-mj-variant',
      {
        tileId,
        projectId,
        gridImageUrl,
        variantIndex,
      },
      { ttl: '5m' }
    )

    return NextResponse.json({ success: true, runId: handle.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
