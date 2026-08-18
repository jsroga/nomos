import { createScorer } from '@mastra/core/evals'
import { z } from 'zod'
import { extractProse, normalizeScore, toMastraJudgingLanguageModel } from './shared'

/**
 * Line-level craft scorer (StoryForge port): counts stated emotion, clichés,
 * and POV breaks per 1000 words. Complements `magic` (holistic quality) with
 * deterministic counts — answers "did the revision actually beat the draft?"
 * and "did the prompt tweak improve prose, or just change it?".
 */

const proseCraftAnalyzeSchema = z.object({
  wordCount: z.number(),
  statedEmotions: z
    .array(z.string())
    .describe('Sentences that state emotion instead of evidencing it'),
  cliches: z.array(z.string()).describe('Stock phrases and clichés, quoted'),
  povBreaks: z.array(z.string()).describe('Passages the POV character could not perceive'),
})

export const proseCraftScorer = createScorer({
  id: 'prose-craft',
  name: 'Prose Craft',
  description:
    'Line-level craft: penalizes stated emotion, clichés, and POV breaks per 1000 words.',
  judge: {
    model: toMastraJudgingLanguageModel(),
    instructions:
      'You are a strict line-editor. You count craft violations precisely and never invent them. Respond with valid JSON matching the requested schema.',
  },
})
  .analyze({
    description: 'Count line-level craft violations',
    outputSchema: proseCraftAnalyzeSchema,
    createPrompt: ({ run }) => `Count craft violations in this prose. Quote each violation exactly. Be strict but do not invent violations.

1. statedEmotions: sentences that STATE an emotion ("she felt furious", "he was terrified") instead of evidencing it through action, perception, or speech.
2. cliches: stock phrases ("heart pounding", "let out a breath she didn't know she was holding", "time seemed to slow").
3. povBreaks: anything the POV character could not perceive or know.

Also estimate wordCount.

PROSE:
${extractProse(run.output)}`,
  })
  .generateScore(({ results }) => {
    // analyzeStepResult is untyped at this Mastra version's chain boundary —
    // re-validate instead of casting.
    const parsed = proseCraftAnalyzeSchema.safeParse(results.analyzeStepResult)
    if (!parsed.success) return 0
    const { wordCount, statedEmotions, cliches, povBreaks } = parsed.data
    const violations = statedEmotions.length + cliches.length + povBreaks.length
    const per1000 = violations / Math.max(wordCount / 1000, 0.25)
    // 0 violations/1000w => 1.0; 10+/1000w => 0.0
    return normalizeScore(1 - per1000 / 10)
  })
  .generateReason(({ results, score }) => {
    const parsed = proseCraftAnalyzeSchema.safeParse(results.analyzeStepResult)
    if (!parsed.success) return `Score ${score.toFixed(2)} — analyze step returned an invalid report.`
    const r = parsed.data
    return `Score ${score.toFixed(2)} — ${r.statedEmotions.length} stated emotions, ${r.cliches.length} clichés, ${r.povBreaks.length} POV breaks in ~${r.wordCount} words.`
  })
