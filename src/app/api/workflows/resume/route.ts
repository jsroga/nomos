import { NextRequest, NextResponse } from 'next/server'
import { ResumeWorkflowSchema } from '@/shared/agent-kernel/workflows/schema'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { getErrorMessage } from '@/shared/errors/error-utils'

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const payload = ResumeWorkflowSchema.safeParse(json)

    if (!payload.success) {
      return NextResponse.json(
        { error: API_ERROR.INVALID_PAYLOAD, details: payload.error.errors },
        { status: 400 }
      )
    }

    const { workflowId, stepId, action } = payload.data

    console.log(
      `${API_LOG_PREFIX.WORKFLOW_RESUME} ${workflowId} at step ${stepId} with action ${action}`
    )

    // TODO: Load workflow instance and resume
    // const workflow = WorkflowRegistry.get(workflowId)
    // await workflow.resume({ stepId, context: { approvalAction: action, ...stepPayload } })

    return NextResponse.json({ success: true, message: API_ERROR.WORKFLOW_RESUMPTION_QUEUED })
  } catch (error: unknown) {
    console.error(API_LOG_PREFIX.WORKFLOW_ERROR, error)
    return NextResponse.json(
      { error: API_ERROR.INTERNAL_SERVER_ERROR, details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
