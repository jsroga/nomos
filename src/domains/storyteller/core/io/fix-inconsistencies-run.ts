import '@/shared/data/server-guard'
import { recordFromJson } from '@/shared/data/deep-merge'
import { getMastraInstance } from '@/shared/agent-kernel'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { MastraWorkflowStatus } from '@/shared/data/constants/protocol'
import {
  FIX_INCONSISTENCIES_VERDICT_STEP,
  FIX_INCONSISTENCIES_WORKFLOW_ID,
  fixInconsistenciesOutputSchema,
  type FixInconsistenciesOutput,
} from '@/domains/storyteller/ai/workflows/fix-inconsistencies-contract'
import {
  FixInconsistenciesRunStatus,
  FixInconsistenciesVerdictAction,
} from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'
import { workflowStepStartId } from './fix-inconsistencies-workflow-events'

export type FixInconsistenciesStartResult =
  | { ok: true; runId: string; status: FixInconsistenciesRunStatus.Suspended; payload: Record<string, unknown> }
  | { ok: true; runId: string; status: FixInconsistenciesRunStatus.Success; output: FixInconsistenciesOutput }
  | { ok: false; runId: string; error: string }

export interface FixInconsistenciesStartOptions {
  tracingOptions?: {
    traceId: string
    parentSpanId?: string
  }
  onStep?: (stepId: string) => void | Promise<void>
}

function workflowOrError() {
  const workflow = getMastraInstance().getWorkflow(FIX_INCONSISTENCIES_WORKFLOW_ID)
  if (!workflow) return { error: API_ERROR.WORKFLOW_NOT_REGISTERED, workflow: null }
  return { error: null, workflow }
}

function suspendPayloadFromResult(steps: unknown): Record<string, unknown> {
  const table = recordFromJson(steps)
  const step = recordFromJson(table[FIX_INCONSISTENCIES_VERDICT_STEP])
  return recordFromJson(step.suspendPayload)
}

export async function createFixInconsistenciesWorkflowRun(projectId: string) {
  const { workflow, error } = workflowOrError()
  if (!workflow) {
    return { ok: false as const, error: error ?? API_ERROR.WORKFLOW_NOT_REGISTERED }
  }
  const run = await workflow.createRun({ resourceId: projectId })
  return { ok: true as const, workflow, run }
}

export async function startFixInconsistenciesRun(
  projectId: string
): Promise<FixInconsistenciesStartResult> {
  const created = await createFixInconsistenciesWorkflowRun(projectId)
  if (!created.ok) return { ok: false, runId: '', error: created.error }
  return executeFixInconsistenciesStart(created.run, projectId)
}

function interpretFixInconsistenciesStartResult(
  runId: string,
  result: { status: string; steps?: unknown; result?: unknown }
): FixInconsistenciesStartResult {
  if (result.status === FixInconsistenciesRunStatus.Suspended) {
    return {
      ok: true,
      runId,
      status: FixInconsistenciesRunStatus.Suspended,
      payload: suspendPayloadFromResult(result.steps),
    }
  }

  if (result.status === FixInconsistenciesRunStatus.Success) {
    const parsed = fixInconsistenciesOutputSchema.safeParse(result.result)
    if (!parsed.success) {
      return { ok: false, runId, error: API_ERROR.INTERNAL_SERVER_ERROR }
    }
    return {
      ok: true,
      runId,
      status: FixInconsistenciesRunStatus.Success,
      output: parsed.data,
    }
  }

  return { ok: false, runId, error: API_ERROR.INTERNAL_SERVER_ERROR }
}

export async function executeFixInconsistenciesStart(
  run: Extract<Awaited<ReturnType<typeof createFixInconsistenciesWorkflowRun>>, { ok: true }>['run'],
  projectId: string,
  options?: FixInconsistenciesStartOptions
): Promise<FixInconsistenciesStartResult> {
  const onStep = options?.onStep
  const stopWatch = onStep
    ? run.watch(event => {
        const stepId = workflowStepStartId(event)
        if (stepId) return onStep(stepId)
      })
    : undefined
  try {
    const result = await run.start({
      inputData: { projectId },
      ...(options?.tracingOptions ? { tracingOptions: options.tracingOptions } : {}),
    })
    return interpretFixInconsistenciesStartResult(run.runId, result)
  } finally {
    stopWatch?.()
  }
}

export async function resumeFixInconsistenciesRun(
  runId: string,
  action: FixInconsistenciesVerdictAction
): Promise<{ ok: true; output: FixInconsistenciesOutput } | { ok: false; status: number; error: string }> {
  const { workflow, error } = workflowOrError()
  if (!workflow) {
    return { ok: false, status: 500, error: error ?? API_ERROR.WORKFLOW_NOT_REGISTERED }
  }

  const state = await workflow.getWorkflowRunById(runId)
  if (!state || state.status !== MastraWorkflowStatus.Suspended) {
    return { ok: false, status: 404, error: API_ERROR.WORKFLOW_NOT_FOUND_OR_COMPLETED }
  }

  const run = await workflow.createRun({ runId })
  const result = await run.resume({
    step: FIX_INCONSISTENCIES_VERDICT_STEP,
    resumeData: { action },
  })

  if (result.status !== FixInconsistenciesRunStatus.Success) {
    return { ok: false, status: 500, error: API_ERROR.FAILED_RESUME_WORKFLOW }
  }

  const parsed = fixInconsistenciesOutputSchema.safeParse(result.result)
  if (!parsed.success) {
    return { ok: false, status: 500, error: API_ERROR.INTERNAL_SERVER_ERROR }
  }
  return { ok: true, output: parsed.data }
}

export async function readFixInconsistenciesRun(runId: string) {
  const { workflow, error } = workflowOrError()
  if (!workflow) {
    return { ok: false as const, status: 500, error: error ?? API_ERROR.WORKFLOW_NOT_REGISTERED }
  }
  const state = await workflow.getWorkflowRunById(runId)
  if (!state) {
    return { ok: false as const, status: 404, error: API_ERROR.WORKFLOW_NOT_FOUND_OR_COMPLETED }
  }
  const payload =
    state.status === MastraWorkflowStatus.Suspended
      ? suspendPayloadFromResult(state.steps)
      : undefined
  return {
    ok: true as const,
    runId,
    status: state.status,
    stepId:
      state.status === MastraWorkflowStatus.Suspended ? FIX_INCONSISTENCIES_VERDICT_STEP : undefined,
    suspendPayload: payload,
  }
}
