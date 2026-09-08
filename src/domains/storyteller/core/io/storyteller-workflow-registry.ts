import {
  ARTIFACT_DRAFT_WORKFLOW_ID,
} from '@/domains/storyteller/ai/workflows/artifact-draft-contract'
import { BEAT_DRAFT_WORKFLOW_ID } from '@/domains/storyteller/ai/workflows/beat-draft-contract'
import { FIX_INCONSISTENCIES_WORKFLOW_ID } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-contract'

/**
 * Studio `listWorkflows()` and `getWorkflow()` both use this object key.
 * Keys match `createWorkflow({ id })` so each workflow appears once.
 */
export function bindStorytellerWorkflowRegistry<TBeat, TArtifact, TFix>(input: {
  beatDraft: TBeat
  artifactDraft: TArtifact
  fixInconsistencies: TFix
}): Record<string, TBeat | TArtifact | TFix> {
  return {
    [BEAT_DRAFT_WORKFLOW_ID]: input.beatDraft,
    [ARTIFACT_DRAFT_WORKFLOW_ID]: input.artifactDraft,
    [FIX_INCONSISTENCIES_WORKFLOW_ID]: input.fixInconsistencies,
  }
}
