import { createScorer } from '@mastra/core/evals'
import { z } from 'zod'
import { promptRepository } from '@/shared/agent-kernel/prompts/repository'
import { inputRecord, normalizeScore, outputToString, toMastraJudgingModel } from './shared'

const hallucinationAnalyzeSchema = z.object({
  score: z.number(),
  reasoning: z.string().optional(),
})

export const hallucinationScorer = createScorer({
  id: 'hallucination',
  name: 'Hallucination',
  description: 'Grounding check against established canon',
  judge: {
    model: toMastraJudgingModel(),
    instructions:
      'You are a ruthless fact-checker. Respond with valid JSON containing score (0-1) and reasoning.',
  },
})
  .analyze({
    description: 'Detect fabricated content against canon',
    outputSchema: hallucinationAnalyzeSchema,
    createPrompt: async ({ run }) => {
      const input = inputRecord(run.input)
      const reference = run.groundTruth
        ? JSON.stringify(run.groundTruth)
        : String(input.context ?? input.canon ?? '')
      const output = outputToString(run.output)
      return promptRepository.getPrompt('hallucination-judge', { reference, output })
    },
  })
  .generateScore(({ results }) => {
    const analyzed = results.analyzeStepResult as { score?: number } | undefined
    return normalizeScore(analyzed?.score ?? 0)
  })
  .generateReason(({ results, score }) => {
    const analyzed = results.analyzeStepResult as { reasoning?: string } | undefined
    return analyzed?.reasoning ?? `Hallucination-free score: ${(score * 100).toFixed(0)}%`
  })
