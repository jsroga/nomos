import { NextResponse } from 'next/server'
import { ActionApiResultType } from '@/shared/data/constants/protocol'
import { flushObservability } from '@/shared/observability/observability'
import type { ActionHandler } from '../action-handler-context'

export const handleDefaultAction: ActionHandler = async (_ctx, action) => {
  console.log(`⚠️ Unhandled action type: ${action.type}`)
  try {
    await flushObservability()
  } catch {
    // Flush must not fail the acknowledgement.
  }
  return NextResponse.json({
    success: true,
    result: {
      type: ActionApiResultType.ACKNOWLEDGED,
      message: `Action ${action.type} acknowledged`,
    },
  })
}
