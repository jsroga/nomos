import '@/shared/data/server-guard'
import { z } from 'zod'
import { getMastraInstance } from '@/shared/agent-kernel'
import { BEAT_DRAFT_WORKFLOW_ID } from '@/domains/storyteller/core/io/mastra-runtime'
import {
  selectQueuedVerdicts,
  type QueuedVerdict,
  type QueuedVerdictRun,
} from '@/domains/storyteller/core/workflow/queued-verdicts'

enum WorkflowListMethod {
  GetWorkflowRuns = 'getWorkflowRuns',
}

const WorkflowRunListSchema = z.object({
  runs: z
    .array(
      z.object({
        id: z.string().optional(),
        runId: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .optional(),
})

function queuedRunFromRow(
  row: { id?: string; runId?: string; status?: string },
  projectId: string
): QueuedVerdictRun | null {
  const runId = row.runId ?? row.id ?? ''
  if (runId.length === 0) return null
  return {
    runId,
    status: row.status ?? '',
    projectId,
  }
}

enum BeatDraftWorkflowRegistryKey {
  ExportName = 'beatDraftWorkflow',
}

function beatDraftWorkflowOrNull(): object | null {
  const mastra = getMastraInstance()
  for (const key of [BEAT_DRAFT_WORKFLOW_ID, BeatDraftWorkflowRegistryKey.ExportName]) {
    try {
      const workflow: unknown = mastra.getWorkflow(key)
      if (typeof workflow === 'object' && workflow !== null) return workflow
    } catch {
      // Production registry keys the export name; getWorkflow(id) throws.
    }
  }
  return null
}

export async function listQueuedEditorialVerdicts(projectId: string): Promise<QueuedVerdict[]> {
  const workflow = beatDraftWorkflowOrNull()
  if (!workflow) return []
  const method = Reflect.get(workflow, WorkflowListMethod.GetWorkflowRuns)
  if (typeof method !== 'function') return []
  try {
    const listedUnknown: unknown = await Reflect.apply(method, workflow, [{ resourceId: projectId }])
    const listed = WorkflowRunListSchema.safeParse(listedUnknown)
    if (!listed.success) return []
    const mapped: QueuedVerdictRun[] = []
    for (const row of listed.data.runs ?? []) {
      const run = queuedRunFromRow(row, projectId)
      if (run) mapped.push(run)
    }
    return selectQueuedVerdicts(mapped, projectId)
  } catch {
    return []
  }
}
