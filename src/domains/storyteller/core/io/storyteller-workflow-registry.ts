import {
  ARTIFACT_DRAFT_WORKFLOW_ID,
} from '@/domains/storyteller/ai/workflows/artifact-draft-contract'
import { BEAT_DRAFT_WORKFLOW_ID } from '@/domains/storyteller/ai/workflows/beat-draft-contract'
import { FIX_INCONSISTENCIES_WORKFLOW_ID } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-contract'

/** Mastra `getWorkflow` looks up the object key, not `createWorkflow({ id })`. */
export enum StorytellerWorkflowExportName {
  BeatDraft = 'beatDraftWorkflow',
  ArtifactDraft = 'artifactDraftWorkflow',
  FixInconsistencies = 'fixInconsistenciesWorkflow',
}

export function bindStorytellerWorkflowRegistry<TBeat, TArtifact, TFix>(input: {
  beatDraft: TBeat
  artifactDraft: TArtifact
  fixInconsistencies: TFix
}): Record<string, TBeat | TArtifact | TFix> {
  return {
    [StorytellerWorkflowExportName.BeatDraft]: input.beatDraft,
    [BEAT_DRAFT_WORKFLOW_ID]: input.beatDraft,
    [StorytellerWorkflowExportName.ArtifactDraft]: input.artifactDraft,
    [ARTIFACT_DRAFT_WORKFLOW_ID]: input.artifactDraft,
    [StorytellerWorkflowExportName.FixInconsistencies]: input.fixInconsistencies,
    [FIX_INCONSISTENCIES_WORKFLOW_ID]: input.fixInconsistencies,
  }
}
