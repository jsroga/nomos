import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getMastraInstance } from '@/shared/agent-kernel'
import {
  BEAT_DRAFT_WORKFLOW_ID,
  VERDICT_STEP_ID,
} from '@/domains/storyteller/io/mastra-runtime'
import { getErrorMessage } from '@/shared/errors/error-utils'

export const runtime = 'nodejs'

/**
 * Request contract is UNCHANGED (published — `useChatStream.resumeWorkflow()`
 * sends exactly this shape). `selectedOption` maps to the workflow verdict
 * server-side: approve / revise / kill. `additionalFeedback` becomes the
 * editor's note (outranks the critics in the revision prompt).
 */
const ResumeSchema = z.object({
  runId: z.string(),
  selectedOption: z.string(),
  additionalFeedback: z.string().optional(),
})

const VERDICT_ACTIONS = ['approve', 'revise', 'kill'] as const
type VerdictAction = (typeof VERDICT_ACTIONS)[number]

function toVerdictAction(selectedOption: string): VerdictAction | null {
  const normalized = selectedOption.trim().toLowerCase()
  return VERDICT_ACTIONS.find(action => action === normalized) ?? null
}

/**
 * POST /api/storyteller/workflow/resume
 *
 * Resumes a suspended beat-draft-workflow run with the editor's verdict.
 * Runs are resolved from Mastra storage — a suspended verdict survives
 * server restarts and can be resumed from any instance.
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

    const action = toVerdictAction(selectedOption)
    if (!action) {
      return NextResponse.json(
        {
          error: `Unknown option: ${selectedOption}. Expected approve, revise, or kill.`,
          runId,
        },
        { status: 400 }
      )
    }

    const workflow = getMastraInstance().getWorkflow(BEAT_DRAFT_WORKFLOW_ID)
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not registered' },
        { status: 500 }
      )
    }

    // Recover the persisted run state from storage (survives restarts).
    const state = await workflow.getWorkflowRunById(runId)
    if (!state || state.status !== 'suspended') {
      return NextResponse.json(
        { error: 'Workflow not found or already completed', runId },
        { status: 404 }
      )
    }

    const run = await workflow.createRun({ runId })
    const result = await run.resume({
      step: VERDICT_STEP_ID,
      resumeData: {
        action,
        ...(additionalFeedback ? { note: additionalFeedback } : {}),
      },
    })

    if (result.status === 'failed') {
      return NextResponse.json(
        { error: 'Failed to resume workflow', runId, details: getErrorMessage(result.error) },
        { status: 500 }
      )
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
 * Check status of a suspended workflow run (from durable storage).
 */
export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get('runId')

  if (!runId) {
    return NextResponse.json(
      { error: 'runId query parameter is required' },
      { status: 400 }
    )
  }

  const workflow = getMastraInstance().getWorkflow(BEAT_DRAFT_WORKFLOW_ID)
  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not registered' }, { status: 500 })
  }

  const state = await workflow.getWorkflowRunById(runId)
  if (!state) {
    return NextResponse.json({ found: false, runId }, { status: 404 })
  }

  return NextResponse.json({
    found: true,
    runId,
    status: state.status,
    stepId: state.status === 'suspended' ? VERDICT_STEP_ID : undefined,
  })
}
