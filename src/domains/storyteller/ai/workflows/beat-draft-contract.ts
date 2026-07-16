/**
 * beat-draft-workflow contract — ids and boundary schemas only.
 *
 * Lives apart from the workflow implementation so consumers (the entry tool,
 * the resume API route) can import the contract without pulling in the
 * workflow module — avoiding a static import cycle through the tools barrel.
 */

import { z } from 'zod'
import { BeatPlanSchema } from '@/domains/storyteller/ai/agents/BeatPlanner/beat-plan-schema'

export const BEAT_DRAFT_WORKFLOW_ID = 'beat-draft-workflow'
export const VERDICT_STEP_ID = 'editorial-verdict'
/** Tool id of the single workflow entry tool (tool #10). */
export const RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID = 'run_beat_draft_workflow'

export const beatDraftInputSchema = z.object({
  projectId: z.string().min(1),
  episodeId: z.string().min(1),
  brief: z
    .string()
    .min(1)
    .describe('What this beat must accomplish (goal, POV, plants/payoffs)'),
  characters: z.array(z.string()).default([]),
  autoApprove: z
    .boolean()
    .optional()
    .describe('Skip the editorial-verdict suspension (batch/eval mode)'),
  wildcards: z
    .boolean()
    .optional()
    .describe(
      'Run the Muse brainstorm→rank stage and feed surviving sparks to the planner (PLAN-V2 5.3). Default OFF until the A/B gate (5.6) flips it.'
    ),
})

export const beatDraftOutputSchema = z.object({
  finalDraft: z.string(),
  critiques: z.string(),
  beatPlan: BeatPlanSchema.optional(),
  beatId: z.string().optional(),
  saved: z.boolean(),
  killed: z.boolean(),
  message: z.string(),
})

export type BeatDraftInput = z.infer<typeof beatDraftInputSchema>
export type BeatDraftOutput = z.infer<typeof beatDraftOutputSchema>
