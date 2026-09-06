import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getMastraInstance } from '@/shared/agent-kernel'
import {
  BEAT_DRAFT_WORKFLOW_ID,
  VERDICT_STEP_ID,
  beatDraftOutputSchema,
} from '@/domains/storyteller/core/io/mastra-runtime'
import { StorytellerWorkflowVerdict } from '@/domains/storyteller/core/io/workflow-verdict'
import {
  loadSuspendedArtifactDraftRun,
  mapResumeOptionToArtifactVerdict,
  resumeArtifactDraftRun,
} from '@/domains/storyteller/core/io/resume-artifact-draft'
import { persistPromotedProjectRule, PromotedRuleCopy } from '@/domains/storyteller/core/io/promote-project-rule'
import { listQueuedEditorialVerdicts } from '@/domains/storyteller/core/io/list-queued-verdicts'
import { recordFromJson } from '@/shared/data/json-guards'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { HttpStatus, QueryFlag } from '@/shared/data/constants/protocol'
import { MastraWorkflowStatus, QueryParam } from '@/shared/data/constants/protocol'

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
  if (normalized === StorytellerWorkflowVerdict.ApprovePromote) {
    return StorytellerWorkflowVerdict.Approve
  }
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

enum WorkflowResumeField {
  Result = 'result',
}

function workflowOutputPayload(result: unknown): unknown {
  return recordFromJson(result)[WorkflowResumeField.Result]
}

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

async function resumeArtifactDraftRequest(
  runId: string,
  selectedOption: string
): Promise<NextResponse> {
  const loaded = await loadSuspendedArtifactDraftRun(runId)
  if (!loaded) {
    return NextResponse.json(
      { error: API_ERROR.WORKFLOW_NOT_FOUND_OR_COMPLETED, runId },
      { status: HttpStatus.NOT_FOUND }
    )
  }
  const denied = await denyUnlessRunOwner(loaded.state, runId)
  if (denied) return denied
  const verdict = mapResumeOptionToArtifactVerdict(selectedOption)
  if (!verdict) {
    return NextResponse.json(
      {
        error: `Unknown option: ${selectedOption}. Expected approve, revise, or kill.`,
        runId,
      },
      { status: HttpStatus.BAD_REQUEST }
    )
  }
  const resumed = await resumeArtifactDraftRun(runId, verdict)
  return NextResponse.json({
    success: true,
    message: `Workflow resumed with option: ${selectedOption}`,
    runId,
    selectedOption,
    output: { persisted: resumed.persisted, message: resumed.message },
  })
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

async function persistPromoteIfRequested(
  selectedOption: string,
  additionalFeedback: string | undefined,
  beatState: unknown
): Promise<void> {
  if (selectedOption.trim().toLowerCase() !== StorytellerWorkflowVerdict.ApprovePromote) return
  const projectId = projectIdFromRunState(beatState)
  if (!projectId) return
  await persistPromotedProjectRule({
    projectId,
    ruleText: additionalFeedback?.trim() || PromotedRuleCopy.DefaultRule,
    quote: PromotedRuleCopy.DefaultQuote,
  })
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

    const beatState = await workflow.getWorkflowRunById(runId)
    if (!beatState || beatState.status !== MastraWorkflowStatus.Suspended) {
      return await resumeArtifactDraftRequest(runId, selectedOption)
    }

    const denied = await denyUnlessRunOwner(beatState, runId)
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

    const parsedOutput = beatDraftOutputSchema.safeParse(workflowOutputPayload(result))
    await persistPromoteIfRequested(selectedOption, additionalFeedback, beatState)
    return NextResponse.json({
      success: true,
      message: `Workflow resumed with option: ${selectedOption}`,
      runId,
      selectedOption,
      output: parsedOutput.success ? parsedOutput.data : undefined,
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
  const queued = req.nextUrl.searchParams.get(QueryParam.Queued)
  const projectId = req.nextUrl.searchParams.get(QueryParam.ProjectId)
  if (queued === QueryFlag.On) {
    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
    }
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }
    if (!(await tryProjectScope(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: HttpStatus.NOT_FOUND })
    }
    const queuedVerdicts = await listQueuedEditorialVerdicts(projectId)
    return NextResponse.json({ queued: queuedVerdicts })
  }

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
