import { NextRequest, NextResponse } from 'next/server'
import { ResumeWorkflowSchema } from '@/shared/agent-kernel/workflows/schema'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { requireAuth } from '@/shared/auth/auth'
import { HttpStatus } from '@/shared/data/constants/protocol'

export async function POST(req: NextRequest) {
  try {
    // Currently a stub (see the TODO below) with no callers, so there is no
    // workflow to attribute to a tenant yet. Authenticated so it cannot become
    // an anonymous entry point the moment the TODO is implemented.
    // auth-scope: session-existence-only — no workflow is loaded yet.
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json(
        { error: API_ERROR.UNAUTHORIZED },
        { status: HttpStatus.UNAUTHORIZED }
      )
    }

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
