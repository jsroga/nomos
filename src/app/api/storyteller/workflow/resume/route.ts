import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { workflowStore } from '@/domains/storyteller/utils/workflow-context'
import { getErrorMessage } from '@/lib/error-utils'

export const runtime = 'nodejs'

const ResumeSchema = z.object({
  runId: z.string(),
  selectedOption: z.string(),
  additionalFeedback: z.string().optional(),
})

/**
 * POST /api/storyteller/workflow/resume
 *
 * Resumes a suspended workflow with user's choice.
 * Used by the UI when user answers a question from the Writers Room.
 */
export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const payload = ResumeSchema.safeParse(json)

    if (!payload.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: payload.error.errors },
        { status: 400 }
      )
    }

    const { runId, selectedOption, additionalFeedback } = payload.data

    // Check if workflow exists
    const suspended = workflowStore.get(runId)
    if (!suspended) {
      return NextResponse.json(
        { error: 'Workflow not found or already completed', runId },
        { status: 404 }
      )
    }

    // Resume the workflow
    const resumed = workflowStore.resume(runId, { selectedOption, additionalFeedback })

    if (!resumed) {
      return NextResponse.json({ error: 'Failed to resume workflow' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Workflow resumed with option: ${selectedOption}`,
      runId,
      selectedOption,
    })
  } catch (error: unknown) {
    console.error('[Workflow Resume] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/storyteller/workflow/resume?runId=xxx
 *
 * Check status of a suspended workflow
 */
export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get('runId')

  if (!runId) {
    // Return all suspended workflows (for debugging)
    const workflows = workflowStore.list()
    return NextResponse.json({
      count: workflows.length,
      workflows: workflows.map(w => ({
        runId: w.runId,
        stepId: w.stepId,
        projectId: w.projectId,
        suspendedAt: new Date(w.suspendedAt).toISOString(),
      })),
    })
  }

  const suspended = workflowStore.get(runId)
  if (!suspended) {
    return NextResponse.json({ found: false, runId }, { status: 404 })
  }

  return NextResponse.json({
    found: true,
    runId: suspended.runId,
    stepId: suspended.stepId,
    projectId: suspended.projectId,
    suspendedAt: new Date(suspended.suspendedAt).toISOString(),
  })
}
