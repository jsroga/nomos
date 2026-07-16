/**
 * Ranked-idea schema (PLAN-V2 5.3) — the rank stage's output unit.
 * Pure module (zod only), eval/test-importable without the server guard.
 */

import { z } from 'zod'
import { WildIdeaSchema } from './wild-idea-schema'

export const IdeaScoreSchema = z.object({
  surprise: z
    .number()
    .min(0)
    .max(10)
    .describe('Not derivable from the brief; the least obvious constraint collision'),
  storyMotion: z
    .number()
    .min(0)
    .max(10)
    .describe('Forces an irreversible state change someone must respond to'),
  fit: z
    .number()
    .min(0)
    .max(10)
    .describe('Usable without breaking established canon (judged WITH bible context)'),
  cost: z
    .number()
    .min(0)
    .max(10)
    .describe('Someone pays a real, felt price'),
})

export const RankedIdeaSchema = z.object({
  idea: WildIdeaSchema,
  scores: IdeaScoreSchema,
  verdict: z.enum(['keep', 'reject']),
  reason: z.string().min(1).describe('One sentence: why kept or rejected'),
})

export const RankReportSchema = z.object({
  ranked: z.array(RankedIdeaSchema).min(1),
})

/** Verdict vocabulary (referenced by rank.ts without magic strings). */
export const IDEA_VERDICT = {
  keep: 'keep',
  reject: 'reject',
} as const

export type IdeaScore = z.infer<typeof IdeaScoreSchema>
export type RankedIdea = z.infer<typeof RankedIdeaSchema>
export type RankReport = z.infer<typeof RankReportSchema>

/** Weighted total used for ordering (storyMotion weighted highest by design). */
export function ideaTotalScore(scores: IdeaScore): number {
  return scores.surprise * 0.25 + scores.storyMotion * 0.4 + scores.fit * 0.15 + scores.cost * 0.2
}
