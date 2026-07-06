import { createScorer } from '@mastra/core/evals'
import { z } from 'zod'
import { promptRepository } from '@/shared/agent-kernel/prompts/repository'
import { inputRecord, normalizeScore, outputToString, toMastraJudgingModel } from './shared'

const personaAnalyzeSchema = z.object({
  score: z.number(),
  reasoning: z.string().optional(),
})

export const personaFidelityScorer = createScorer({
  id: 'persona-fidelity',
  name: 'Persona Fidelity',
  description: 'How well output matches a requested creative persona',
  judge: {
    model: toMastraJudgingModel(),
    instructions:
      'You evaluate persona fidelity in creative writing. Respond with valid JSON containing score (0-100) and reasoning.',
  },
})
  .analyze({
    description: 'Evaluate adherence to target persona style',
    outputSchema: personaAnalyzeSchema,
    createPrompt: async ({ run }) => {
      const input = inputRecord(run.input)
      const content = outputToString(run.output)
      const persona = String(input.persona ?? input.skill ?? 'Unknown')
      return promptRepository.getPrompt('persona-fidelity-judge', { content, persona })
    },
  })
  .generateScore(({ results }) => {
    const analyzed = results.analyzeStepResult as { score?: number } | undefined
    return normalizeScore((analyzed?.score ?? 0) / 100)
  })
  .generateReason(({ results, score }) => {
    const analyzed = results.analyzeStepResult as { reasoning?: string } | undefined
    return analyzed?.reasoning ?? `Persona fidelity score: ${(score * 100).toFixed(0)}`
  })
