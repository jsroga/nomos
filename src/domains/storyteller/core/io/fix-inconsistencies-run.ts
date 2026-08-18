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

export type FixInconsistenciesStartResult =
  | { ok: true; runId: string; status: FixInconsistenciesRunStatus.Suspended; payload: Record<string, unknown> }
  | { ok: true; runId: string; status: FixInconsistenciesRunStatus.Success; output: FixInconsistenciesOutput }
  | { ok: false; runId: string; error: string }

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

export async function createFixInconsistenciesWorkflowRun() {
  const { workflow, error } = workflowOrError()
  if (!workflow) {
    return { ok: false as const, error: error ?? API_ERROR.WORKFLOW_NOT_REGISTERED }
  }
  const run = await workflow.createRun()
  return { ok: true as const, workflow, run }
}

export async function startFixInconsistenciesRun(
  projectId: string
): Promise<FixInconsistenciesStartResult> {
  const created = await createFixInconsistenciesWorkflowRun()
  if (!created.ok) return { ok: false, runId: '', error: created.error }
  return executeFixInconsistenciesStart(created.run, projectId)
}

export async function executeFixInconsistenciesStart(
  run: Extract<Awaited<ReturnType<typeof createFixInconsistenciesWorkflowRun>>, { ok: true }>['run'],
  projectId: string
): Promise<FixInconsistenciesStartResult> {
  const result = await run.start({ inputData: { projectId } })

  if (result.status === FixInconsistenciesRunStatus.Suspended) {
    return {
      ok: true,
      runId: run.runId,
      status: FixInconsistenciesRunStatus.Suspended,
      payload: suspendPayloadFromResult(result.steps),
    }
  }

  if (result.status === FixInconsistenciesRunStatus.Success) {
    const parsed = fixInconsistenciesOutputSchema.safeParse(result.result)
    if (!parsed.success) {
      return { ok: false, runId: run.runId, error: API_ERROR.INTERNAL_SERVER_ERROR }
    }
    return {
      ok: true,
      runId: run.runId,
      status: FixInconsistenciesRunStatus.Success,
      output: parsed.data,
    }
  }

  return { ok: false, runId: run.runId, error: API_ERROR.INTERNAL_SERVER_ERROR }
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
