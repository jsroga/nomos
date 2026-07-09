import { createScorer } from '@mastra/core/evals'
import { z } from 'zod'
import { extractProse, normalizeScore, toMastraJudgingModel } from './shared'

/**
 * Structural stakes scorer (StoryForge port): every beat must cost something;
 * victories must be earned. Catches frictionless drafts that read clean but
 * carry no dramatic weight — the failure mode critics tolerate and holistic
 * scores average away.
 */

const stakesCostAnalyzeSchema = z.object({
  totalBeats: z.number().describe('Distinct plot beats in the prose'),
  beatsWithCost: z.number().describe('Beats that exact a real, felt price from someone'),
  unearnedVictories: z
    .array(z.string())
    .describe('Problems solved by luck or convenience, quoted'),
  frictionlessScenes: z
    .array(z.string())
    .describe('Scenes where no characters\' wants conflict'),
})

export const stakesCostScorer = createScorer({
  id: 'stakes-cost',
  name: 'Stakes Cost',
  description: 'Structural stakes: every beat must cost something; victories must be earned.',
  judge: {
    model: toMastraJudgingModel(),
    instructions:
      'You are a structural editor evaluating narrative stakes. You judge coldly and cite evidence. Respond with valid JSON matching the requested schema.',
  },
})
  .analyze({
    description: 'Assess beats, costs, and earned outcomes',
    outputSchema: stakesCostAnalyzeSchema,
    createPrompt: ({ run }) => `Evaluate the narrative stakes of this prose. Identify each distinct plot beat, then judge:
- beatsWithCost: how many beats exact a real price (loss, wound, compromise, burned bridge) from someone.
- unearnedVictories: problems solved by luck, sudden competence, or an antagonist acting conveniently stupid. Quote them.
- frictionlessScenes: scenes where every present character wants the same thing. Quote the opening line of each.

PROSE:
${extractProse(run.output)}`,
  })
  .generateScore(({ results }) => {
    // analyzeStepResult is untyped at this Mastra version's chain boundary —
    // re-validate instead of casting.
    const parsed = stakesCostAnalyzeSchema.safeParse(results.analyzeStepResult)
    if (!parsed.success) return 0
    const r = parsed.data
    if (r.totalBeats === 0) return 0
    const costRatio = r.beatsWithCost / r.totalBeats
    const penalty = 0.15 * r.unearnedVictories.length + 0.1 * r.frictionlessScenes.length
    return normalizeScore(costRatio - penalty)
  })
  .generateReason(({ results, score }) => {
    const parsed = stakesCostAnalyzeSchema.safeParse(results.analyzeStepResult)
    if (!parsed.success) return `Score ${score.toFixed(2)} — analyze step returned an invalid report.`
    const r = parsed.data
    return `Score ${score.toFixed(2)} — ${r.beatsWithCost}/${r.totalBeats} beats carry cost; ${r.unearnedVictories.length} unearned victories; ${r.frictionlessScenes.length} frictionless scenes.`
  })
