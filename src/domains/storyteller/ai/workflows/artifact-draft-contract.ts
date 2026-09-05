/**
 * artifact-draft-workflow contract — ids and boundary schemas only.
 *
 * Lives apart from the workflow implementation so start/resume routes can
 * import the contract without pulling default deps (and the tools barrel).
 */

import { z } from 'zod'
import { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { FindingSchema } from '@/domains/storyteller/core/types/finding'

export const ARTIFACT_DRAFT_WORKFLOW_ID = 'artifact-draft-workflow'
export const ARTIFACT_DRAFT_VERDICT_STEP_ID = 'artifact-verdict'

export enum ArtifactDraftVerdictAction {
  Accept = 'accept',
  Reject = 'reject',
}

export const artifactDraftInputSchema = z.object({
  projectId: z.string().min(1),
  kind: z.nativeEnum(ArtifactKind),
  draft: z.string().min(1),
  section: z.nativeEnum(BibleSection).optional(),
  characterId: z.string().min(1).optional(),
  episodeId: z.string().min(1).optional(),
})

export const artifactDraftOutputSchema = z.object({
  draft: z.string(),
  critiques: z.string(),
  findings: z.array(FindingSchema),
  persisted: z.boolean(),
  message: z.string(),
})

export type ArtifactDraftInput = z.infer<typeof artifactDraftInputSchema>
export type ArtifactDraftOutput = z.infer<typeof artifactDraftOutputSchema>
