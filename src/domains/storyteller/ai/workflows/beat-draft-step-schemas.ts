import '@/shared/data/server-guard'
import { z } from 'zod'
import { BeatPlanSchema } from '../agents/BeatPlanner/beat-plan-schema'
import { BeatDraftCanonSchema } from '../../core/types/beat-draft-canon'
import { beatDraftInputSchema } from './beat-draft-contract'
import { BeatDraftVerdictAction, CriticReviseMax } from './constants/beat-draft-workflow'

export const beatDraftPlanOutputSchema = beatDraftInputSchema.extend({
  canon: BeatDraftCanonSchema,
  beatPlan: BeatPlanSchema,
  planWarnings: z.array(z.string()),
  sparks: z.array(z.string()),
})

export const beatDraftDraftOutputSchema = beatDraftPlanOutputSchema.extend({
  draft: z.string(),
})

export const beatDraftProseCheckOutputSchema = beatDraftDraftOutputSchema.extend({
  skipCritics: z.boolean(),
  lintReport: z.string(),
})

export const beatDraftCriticLoopInputSchema = beatDraftProseCheckOutputSchema.extend({
  attempt: z.number().int().min(0).max(CriticReviseMax.Value).optional(),
  needsWriterPass: z.boolean().optional(),
  critiques: z.string().optional(),
})

export const beatDraftCriticLoopOutputSchema = beatDraftProseCheckOutputSchema.extend({
  critiques: z.string(),
  attempt: z.number().int().min(1).max(CriticReviseMax.Value),
  needsWriterPass: z.boolean(),
})

export const beatDraftVerdictOutputSchema = beatDraftCriticLoopOutputSchema.extend({
  action: z.enum([
    BeatDraftVerdictAction.Approve,
    BeatDraftVerdictAction.Revise,
    BeatDraftVerdictAction.Kill,
  ]),
  note: z.string().optional(),
})
