import { createScorer } from '@mastra/core/evals'
import { z } from 'zod'
import { createJudgingConfig, extractProse, normalizeScore } from './shared'

/**
 * Story-motion (stasis) scorer — PLAN-V2 5.4.
 *
 * Detects the "literary stasis" failure mode the user rejected: prose that
 * sounds writerly while nothing irreversible happens ("Neither of them moved
 * to fix it"). The judge inventories state changes vs static beats; the score
 * is the motion ratio with a HARD ZERO multiplier when the final beat is
 * static — mood-endings score 0 no matter how good the rest is.
 */

const storyMotionAnalyzeSchema = z.object({
  stateChanges: z
    .array(
      z.object({
        who: z.string().describe('The character who acts'),
        what: z.string().describe('The irreversible thing they do, quoted or paraphrased tightly'),
        irreversible: z
          .boolean()
          .describe('True only if the change cannot be walked back within the scene'),
      })
    )
    .describe('Every beat where someone ACTS and the story state visibly changes'),
  staticBeats: z
    .array(z.string())
    .describe(
      'Quoted beats where nothing happens: mood, atmosphere, reflection, "meaningful" inaction'
    ),
  finalBeatIsStatic: z
    .boolean()
    .describe(
      'True when the LAST beat is stasis — an ending on mood, a held look, an unresolved gesture with no state change'
    ),
})

export const storyMotionScorer = createScorer({
  id: 'story-motion',
  name: 'Story Motion',
  description:
    'Law of Motion: the ratio of state-changing beats to static beats, with a hard zero for prose that ENDS on stasis.',
  judge: createJudgingConfig(
    'You are a structural referee. You inventory story motion precisely: who acted, what changed, what cannot be undone. Mood is not motion. Respond with valid JSON matching the requested schema.',
  ),
})
  .analyze({
    description: 'Inventory state changes vs static beats',
    outputSchema: storyMotionAnalyzeSchema,
    createPrompt: ({ run }) => `Inventory the story motion in this prose.

1. stateChanges: every beat where a character ACTS and the story state visibly changes (knowledge, relationship, power, stakes, possession). Mark irreversible=true only when the change cannot be walked back within the scene.
2. staticBeats: quote every beat where nothing happens — atmosphere, reflection, a held gaze, "meaningful" inaction dressed as drama.
3. finalBeatIsStatic: is the LAST beat of the prose stasis? An ending like "Neither of them moved to fix it" is stasis — it sounds dramatic but nothing happens.

Be strict. Do not invent motion that is not on the page.

PROSE:
${extractProse(run.output)}`,
  })
  .generateScore(({ results }) => {
    // analyzeStepResult is untyped at this Mastra version's chain boundary —
    // re-validate instead of casting.
    const parsed = storyMotionAnalyzeSchema.safeParse(results.analyzeStepResult)
    if (!parsed.success) return 0
    const { stateChanges, staticBeats, finalBeatIsStatic } = parsed.data
    const total = stateChanges.length + staticBeats.length
    if (total === 0) return 0
    // Mood-endings are disqualifying, not a deduction (user decision: "big
    // words, poor action" must never score as mid-tier).
    if (finalBeatIsStatic) return 0
    const irreversibleBonus = stateChanges.some(change => change.irreversible) ? 0 : -0.2
    return normalizeScore(stateChanges.length / total + irreversibleBonus)
  })
  .generateReason(({ results, score }) => {
    const parsed = storyMotionAnalyzeSchema.safeParse(results.analyzeStepResult)
    if (!parsed.success) return `Score ${score.toFixed(2)} — analyze step returned an invalid report.`
    const r = parsed.data
    const ending = r.finalBeatIsStatic ? 'ENDS ON STASIS (hard zero)' : 'ends on motion'
    return `Score ${score.toFixed(2)} — ${r.stateChanges.length} state changes vs ${r.staticBeats.length} static beats; ${ending}.`
  })
