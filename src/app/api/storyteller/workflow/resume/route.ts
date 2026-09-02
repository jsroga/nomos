import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getMastraInstance } from '@/shared/agent-kernel'
import {
  BEAT_DRAFT_WORKFLOW_ID,
  VERDICT_STEP_ID,
} from '@/domains/storyteller/core/io/mastra-runtime'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { MastraWorkflowStatus, QueryParam } from '@/shared/data/constants/protocol'
import { StorytellerWorkflowVerdict } from '@/domains/storyteller/core/storyteller-page-wire'

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

const VERDICT_ACTIONS = [
  StorytellerWorkflowVerdict.Approve,
  StorytellerWorkflowVerdict.Revise,
  StorytellerWorkflowVerdict.Kill,
] as const
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
const NestedProjectIdSchema = z.object({ projectId: z.string().min(1) })
const WorkflowRunStateSchema = z.object({
  input: z.unknown().optional(),
  inputData: z.unknown().optional(),
  requestPayload: z.unknown().optional(),
  resourceId: z.string().optional(),
})

function projectIdFromUnknown(value: unknown): string | undefined {
  const parsed = NestedProjectIdSchema.safeParse(value)
  return parsed.success ? parsed.data.projectId : undefined
}

function projectIdFromRunState(state: unknown): string | undefined {
  const record = WorkflowRunStateSchema.safeParse(state)
  if (!record.success) return undefined
  return (
    projectIdFromUnknown(record.data.input) ??
    projectIdFromUnknown(record.data.inputData) ??
    projectIdFromUnknown(record.data.requestPayload) ??
    record.data.resourceId
  )
}

/**
 * A suspended run belongs to a tenant. The run's input `projectId` is the
 * ownership key (Mastra, not Trigger). A run without one cannot be attributed.
 */
async function denyUnlessRunOwner(
  state: unknown,
  runId: string
): Promise<NextResponse | null> {
  const { session } = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
  }

  const projectId = projectIdFromRunState(state)
  if (!projectId) {
    console.warn(`${API_LOG_PREFIX.STORYTELLER_WORKFLOW_RESUME_ERROR} run ${runId} has no projectId`)
    return NextResponse.json(
      { error: API_ERROR.WORKFLOW_NOT_FOUND_OR_COMPLETED, runId },
      { status: HttpStatus.NOT_FOUND }
    )
  }

  if (!(await tryProjectScope(projectId, session.user.id))) {
    return NextResponse.json(
      { error: API_ERROR.WORKFLOW_NOT_FOUND_OR_COMPLETED, runId },
      { status: HttpStatus.NOT_FOUND }
    )
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const payload = ResumeSchema.safeParse(json)

    if (!payload.success) {
      return NextResponse.json(
        { error: API_ERROR.INVALID_PAYLOAD, details: payload.error.errors },
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
        { error: API_ERROR.WORKFLOW_NOT_REGISTERED },
        { status: 500 }
      )
    }

    // Recover the persisted run state from storage (survives restarts).
    const state = await workflow.getWorkflowRunById(runId)
    if (!state || state.status !== MastraWorkflowStatus.Suspended) {
      return NextResponse.json(
        { error: API_ERROR.WORKFLOW_NOT_FOUND_OR_COMPLETED, runId },
        { status: 404 }
      )
    }

    const denied = await denyUnlessRunOwner(state, runId)
    if (denied) return denied

    const run = await workflow.createRun({ runId })
    const result = await run.resume({
      step: VERDICT_STEP_ID,
      resumeData: {
        action,
        ...(additionalFeedback ? { note: additionalFeedback } : {}),
      },
    })

    if (result.status === MastraWorkflowStatus.Failed) {
      return NextResponse.json(
        { error: API_ERROR.FAILED_RESUME_WORKFLOW, runId, details: getErrorMessage(result.error) },
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
    console.error(API_LOG_PREFIX.STORYTELLER_WORKFLOW_RESUME_ERROR, error)
    return NextResponse.json(
      { error: API_ERROR.INTERNAL_SERVER_ERROR, details: getErrorMessage(error) },
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
  const runId = req.nextUrl.searchParams.get(QueryParam.RunId)

  if (!runId) {
    return NextResponse.json(
      { error: API_ERROR.RUN_ID_QUERY_REQUIRED },
      { status: 400 }
    )
  }

  const workflow = getMastraInstance().getWorkflow(BEAT_DRAFT_WORKFLOW_ID)
  if (!workflow) {
    return NextResponse.json({ error: API_ERROR.WORKFLOW_NOT_REGISTERED }, { status: 500 })
  }

  const state = await workflow.getWorkflowRunById(runId)
  if (!state) {
    return NextResponse.json({ found: false, runId }, { status: 404 })
  }

  const denied = await denyUnlessRunOwner(state, runId)
  if (denied) return denied

  return NextResponse.json({
    found: true,
    runId,
    status: state.status,
    stepId: state.status === MastraWorkflowStatus.Suspended ? VERDICT_STEP_ID : undefined,
  })
}
