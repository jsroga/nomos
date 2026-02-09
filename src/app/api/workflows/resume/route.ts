import { NextRequest, NextResponse } from 'next/server'
import { ResumeWorkflowSchema } from '../../../../workflows/schema'
import { getErrorMessage } from '@/lib/error-utils'

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const payload = ResumeWorkflowSchema.safeParse(json)

    if (!payload.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: payload.error.errors },
        { status: 400 }
      )
    }

    const { workflowId, stepId, action, payload: stepPayload } = payload.data

    console.log(
      `[Workflow API] Resuming workflow ${workflowId} at step ${stepId} with action ${action}`
    )

    // TODO: Load workflow instance and resume
    // const workflow = WorkflowRegistry.get(workflowId)
    // await workflow.resume({ stepId, context: { approvalAction: action, ...stepPayload } })

    return NextResponse.json({ success: true, message: 'Workflow resumption queued' })
  } catch (error: unknown) {
    console.error('[Workflow API] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
