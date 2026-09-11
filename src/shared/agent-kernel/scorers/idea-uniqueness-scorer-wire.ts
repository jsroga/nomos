import { createScorer } from '@mastra/core/evals'
import { scoreIdeaDiversity } from './idea-diversity-metrics-wire'
import { extractIdeaSet } from './idea-set-extract-wire'
import { evalInstrumentDescription } from '@/shared/agent-kernel/prompts/prompt-catalog-copy'
import { ScorerDescriptionBody } from './constants/scorer-descriptions'

/**
 * Deterministic Mastra scorer for idea-set uniqueness (no LLM).
 * Input/output may carry `ideas: string[]`, or output may be newline-separated ideas.
 */
export const ideaUniquenessScorer = createScorer({
  id: 'idea-uniqueness',
  name: 'Idea Uniqueness',
  description: evalInstrumentDescription(ScorerDescriptionBody.IdeaUniqueness),
})
  .generateScore(({ run }) => {
    const ideas = extractIdeaSet(run.input, run.output)
    return scoreIdeaDiversity(ideas).overall
  })
  .generateReason(({ run, score }) => {
    const ideas = extractIdeaSet(run.input, run.output)
    const detail = scoreIdeaDiversity(ideas)
    return `Idea uniqueness overall ${(score * 100).toFixed(0)}: ${detail.reason}`
  })
