/**
 * fix-inconsistencies workflow contract — ids and boundary schemas only.
 */

import { z } from 'zod'
import {
  ConsistencyFixItemSchema,
  ContinuityFindingSchema,
} from './fix-inconsistencies-schema'
import {
  FIX_INCONSISTENCIES_VERDICT_STEP_ID,
  FixInconsistenciesSkipReason,
  FixInconsistenciesVerdictAction,
} from './constants/fix-inconsistencies-workflow'

export const FIX_INCONSISTENCIES_WORKFLOW_ID = 'fix-inconsistencies'
export const FIX_INCONSISTENCIES_VERDICT_STEP = FIX_INCONSISTENCIES_VERDICT_STEP_ID

export const SkippedFindingSchema = z.object({
  findingId: z.string().min(1),
  reason: z.nativeEnum(FixInconsistenciesSkipReason),
  detail: z.string().min(1),
})

export const CanonEpisodeChunkSchema = z.object({
  episodeId: z.string().min(1),
  title: z.string(),
  sequence: z.number().int().nonnegative(),
  premiseJson: z.string(),
  beatsJson: z.string(),
})

export const AssembledCanonSchema = z.object({
  empty: z.boolean(),
  projectId: z.string().min(1),
  bibleJson: z.string(),
  charactersJson: z.string(),
  worldRulesJson: z.string(),
  sectionsJson: z.record(z.string()),
  episodes: z.array(CanonEpisodeChunkSchema),
  bibleLocked: z.boolean(),
  lockedBeatIds: z.array(z.string()),
  lockedCharacterIds: z.array(z.string()),
})

export const fixInconsistenciesInputSchema = z.object({
  projectId: z.string().min(1),
  autoApprove: z
    .boolean()
    .optional()
    .describe('Skip the editorial-verdict suspension (batch/eval mode)'),
})

export const fixInconsistenciesResumeSchema = z.object({
  runId: z.string().min(1),
  action: z.nativeEnum(FixInconsistenciesVerdictAction),
  projectId: z.string().min(1),
})

export const fixInconsistenciesOutputSchema = z.object({
  empty: z.boolean(),
  findings: z.array(ContinuityFindingSchema),
  fixes: z.array(ConsistencyFixItemSchema),
  skipped: z.array(SkippedFindingSchema),
  appliedCount: z.number().int().nonnegative(),
  undoId: z.string().optional(),
  discarded: z.boolean(),
  errors: z.array(z.string()).optional(),
  message: z.string(),
})

export type FixInconsistenciesInput = z.infer<typeof fixInconsistenciesInputSchema>
export type FixInconsistenciesOutput = z.infer<typeof fixInconsistenciesOutputSchema>
export type FixInconsistenciesResume = z.infer<typeof fixInconsistenciesResumeSchema>
export type SkippedFinding = z.infer<typeof SkippedFindingSchema>
export type AssembledCanon = z.infer<typeof AssembledCanonSchema>

export { FixInconsistenciesVerdictAction }
