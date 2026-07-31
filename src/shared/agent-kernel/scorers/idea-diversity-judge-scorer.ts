import { createScorer } from '@mastra/core/evals'
import { z } from 'zod'
import { normalizeScore, toMastraJudgingModel } from './shared'
import { extractIdeaSet } from './idea-set-extract-wire'
import { readNumber, readString, recordFromJson } from '@/shared/data/json-guards'

/**
 * LLM-as-judge Mastra scorer for idea-set uniqueness / randomness — the proper
 * `createScorer({ judge }).analyze()` pipeline (mirrors `magicScorer`). Replaces
 * the former standalone `ideaUniquenessJudgeAgent`, so idea-diversity flows
 * through `scorer.run()` and `evals/run.ts` like every other scorer.
 *
 * Offline (no `JUDGING_MODEL` / API key) the analyze step throws and the runner
 * records 0 — same behavior as the other LLM scorers; the deterministic
 * `ideaUniquenessScorer` is the keys-free complement.
 */

const ideaJudgeSchema = z.object({
  uniqueness: z.number(),
  randomness: z.number(),
  overall: z.number(),
  critique: z.string(),
})

const JUDGE_INSTRUCTIONS = [
  'You judge sets of creative ideas for uniqueness and randomness.',
  'uniqueness (0-1): how distinct ideas are from each other (penalize duplicates and near-paraphrases).',
  'randomness (0-1): lexical and structural variety — not the same template with swapped nouns.',
  'overall: the mean of uniqueness and randomness.',
  'Respond with valid JSON matching the schema. Be harsh on template spam and echo chambers.',
].join('\n')

const JUDGE_PROMPT_PREFIX = 'Judge this idea set:\n'

export const ideaDiversityJudgeScorer = createScorer({
  id: 'idea-diversity-judge',
  name: 'Idea Diversity (LLM Judge)',
  description: 'LLM-judged uniqueness and randomness of a generated idea set',
  judge: {
    model: toMastraJudgingModel(),
    instructions: JUDGE_INSTRUCTIONS,
  },
})
  .analyze({
    description: 'Judge idea-set uniqueness and randomness',
    outputSchema: ideaJudgeSchema,
    createPrompt: ({ run }) => {
      const ideas = extractIdeaSet(run.input, run.output)
      const numbered = ideas.map((idea, index) => `${index + 1}. ${idea}`).join('\n')
      return `${JUDGE_PROMPT_PREFIX}${numbered}`
    },
  })
  .generateScore(({ results }) => {
    const analyzed = recordFromJson(results.analyzeStepResult)
    return normalizeScore(readNumber(analyzed.overall) ?? 0)
  })
  .generateReason(({ results, score }) => {
    const analyzed = recordFromJson(results.analyzeStepResult)
    return readString(analyzed.critique) ?? `Idea diversity (LLM): ${(score * 100).toFixed(0)}`
  })
