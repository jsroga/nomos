import '@/shared/data/server-guard'
import {
  ARTIFACT_DRAFT_VERDICT_STEP_ID,
  ARTIFACT_DRAFT_WORKFLOW_ID,
  artifactDraftInputSchema,
  artifactDraftOutputSchema,
  type ArtifactDraftInput,
} from '@/domains/storyteller/ai/workflows/artifact-draft-contract'
import { BeatDraftWorkflowFailurePrefix, BeatDraftWorkflowStatus } from '@/domains/storyteller/ai/constants/workflow-tool'
import { FindingSchema, type Finding } from '@/domains/storyteller/core/types/finding'
import { getMastraInstance } from '@/shared/agent-kernel'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { recordFromJson, readString } from '@/shared/data/json-guards'

export enum ArtifactDraftRunStatus {
  Suspended = 'suspended',
  Completed = 'completed',
  Failed = 'failed',
}

enum ArtifactDraftStartCopy {
  Ready = 'Artifact draft ready — Accept to persist or Reject to discard.',
}

export interface StartArtifactDraftResult {
  runId: string
  status: ArtifactDraftRunStatus
  message: string
  draft?: string
  critiques?: string
  findings?: Finding[]
}

function findingsFromUnknown(value: unknown): Finding[] {
  if (!Array.isArray(value)) return []
  const findings: Finding[] = []
  for (const item of value) {
    const parsed = FindingSchema.safeParse(item)
    if (parsed.success) findings.push(parsed.data)
  }
  return findings
}

function suspendFields(steps: unknown): {
  message: string
  draft: string
  critiques: string
  findings: Finding[]
} {
  const table = recordFromJson(steps)
  const step = recordFromJson(table[ARTIFACT_DRAFT_VERDICT_STEP_ID])
  const payload = recordFromJson(step.suspendPayload)
  return {
    message: readString(payload.reason) ?? ArtifactDraftStartCopy.Ready,
    draft: readString(payload.draft) ?? '',
    critiques: readString(payload.critiques) ?? '',
    findings: findingsFromUnknown(payload.findings),
  }
}

export async function startArtifactDraft(
  input: ArtifactDraftInput
): Promise<StartArtifactDraftResult> {
  const parsed = artifactDraftInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      runId: '',
      status: ArtifactDraftRunStatus.Failed,
      message: parsed.error.message,
    }
  }

  const workflow = getMastraInstance().getWorkflow(ARTIFACT_DRAFT_WORKFLOW_ID)
  if (!workflow) {
    return {
      runId: '',
      status: ArtifactDraftRunStatus.Failed,
      message: `${BeatDraftWorkflowFailurePrefix.NotRegistered} ${ARTIFACT_DRAFT_WORKFLOW_ID} is not registered`,
    }
  }

  try {
    const run = await workflow.createRun({ resourceId: parsed.data.projectId })
    const result = await run.start({ inputData: parsed.data })

    if (result.status === ArtifactDraftRunStatus.Suspended) {
      const fields = suspendFields(result.steps)
      return {
        runId: run.runId,
        status: ArtifactDraftRunStatus.Suspended,
        message: fields.message,
        draft: fields.draft,
        critiques: fields.critiques,
        findings: fields.findings,
      }
    }

    if (result.status === BeatDraftWorkflowStatus.Success) {
      const output = artifactDraftOutputSchema.parse(result.result)
      return {
        runId: run.runId,
        status: ArtifactDraftRunStatus.Completed,
        message: output.message,
        draft: output.draft,
        critiques: output.critiques,
        findings: output.findings,
      }
    }

    return {
      runId: run.runId,
      status: ArtifactDraftRunStatus.Failed,
      message: `${BeatDraftWorkflowFailurePrefix.EndedWithStatus} ${result.status}`,
    }
  } catch (error: unknown) {
    return {
      runId: '',
      status: ArtifactDraftRunStatus.Failed,
      message: `${BeatDraftWorkflowFailurePrefix.ExecuteFailed} ${getErrorMessage(error)}`,
    }
  }
}
