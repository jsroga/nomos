import '@/shared/data/server-guard'
import {
  ARTIFACT_DRAFT_VERDICT_STEP_ID,
  ARTIFACT_DRAFT_WORKFLOW_ID,
  ArtifactDraftVerdictAction,
  artifactDraftOutputSchema,
} from '@/domains/storyteller/ai/workflows/artifact-draft-contract'
import { StorytellerWorkflowVerdict } from '@/domains/storyteller/core/io/workflow-verdict'
import { getMastraInstance } from '@/shared/agent-kernel'
import { recordFromJson } from '@/shared/data/json-guards'
import { MastraWorkflowStatus } from '@/shared/data/constants/protocol'
import { getErrorMessage } from '@/shared/errors/error-utils'

enum WorkflowResumeField {
  Result = 'result',
}

export function mapResumeOptionToArtifactVerdict(
  option: string
): ArtifactDraftVerdictAction | null {
  const normalized = option.trim().toLowerCase()
  if (
    normalized === StorytellerWorkflowVerdict.Approve ||
    normalized === ArtifactDraftVerdictAction.Accept
  ) {
    return ArtifactDraftVerdictAction.Accept
  }
  if (
    normalized === StorytellerWorkflowVerdict.Kill ||
    normalized === ArtifactDraftVerdictAction.Reject
  ) {
    return ArtifactDraftVerdictAction.Reject
  }
  return null
}

export interface ResumeArtifactDraftResult {
  found: boolean
  persisted: boolean
  message: string
}

export async function loadSuspendedArtifactDraftRun(runId: string) {
  const workflow = getMastraInstance().getWorkflow(ARTIFACT_DRAFT_WORKFLOW_ID)
  if (!workflow) return undefined
  const state = await workflow.getWorkflowRunById(runId)
  if (!state || state.status !== MastraWorkflowStatus.Suspended) return undefined
  return { workflow, state }
}

export async function resumeArtifactDraftRun(
  runId: string,
  action: ArtifactDraftVerdictAction
): Promise<ResumeArtifactDraftResult> {
  const loaded = await loadSuspendedArtifactDraftRun(runId)
  if (!loaded) {
    return { found: false, persisted: false, message: '' }
  }
  const run = await loaded.workflow.createRun({ runId })
  const result = await run.resume({
    step: ARTIFACT_DRAFT_VERDICT_STEP_ID,
    resumeData: { action },
  })
  if (result.status === MastraWorkflowStatus.Failed) {
    return {
      found: true,
      persisted: false,
      message: getErrorMessage(result.error),
    }
  }
  const parsed = artifactDraftOutputSchema.safeParse(
    recordFromJson(result)[WorkflowResumeField.Result]
  )
  return {
    found: true,
    persisted: parsed.success ? parsed.data.persisted : false,
    message: parsed.success ? parsed.data.message : '',
  }
}
