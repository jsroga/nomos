/**
 * Idea-diversity dataset — the fixture idea sets (diverse / repetitive-echo /
 * template-filler / seeded-sampler) shaped as `evals/run.ts` examples, so they
 * score through `scorer.run()` like the storyteller golden set. Replaces the
 * old bespoke `runIdeaDiversityEval` harness.
 *
 * Each example carries the idea set on `input.ideas` (and joined on
 * `referenceOutput`) and scopes itself to the idea scorers.
 */

import {
  generateIdeaSets,
  DEFAULT_IDEA_PROMPT,
} from '@/evals/idea-diversity/generate-ideas-wire'
import type { RunnableEvalExample } from '../types'

const IDEA_COUNT = 8
const IDEA_SEED = 42
const IDEA_CATEGORY = 'idea-diversity'
const IDEA_SCORERS = ['idea-uniqueness', 'idea-diversity-judge'] as const

function buildExamples(): RunnableEvalExample[] {
  return generateIdeaSets({ prompt: DEFAULT_IDEA_PROMPT, count: IDEA_COUNT, seed: IDEA_SEED }).map(
    set => ({
      id: `idea-${set.agentId}`,
      input: { ideas: set.ideas, message: set.prompt },
      referenceOutput: set.ideas.join('\n'),
      metadata: {
        category: IDEA_CATEGORY,
        description: set.label,
        scorers: IDEA_SCORERS,
      },
    })
  )
}

export const IDEA_DIVERSITY_DATASET = {
  name: IDEA_CATEGORY,
  description:
    'Fixture idea sets (diverse / repetitive / template / seeded) scored for uniqueness + randomness',
  examples: buildExamples(),
}
