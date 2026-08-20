import { createScorer } from '@mastra/core/evals'
import { z } from 'zod'
import { promptRepository } from '@/shared/agent-kernel/prompts/repository'
import { createJudgingConfig, inputRecord, normalizeScore, outputToString } from './shared'
import { readNumber, readString, recordFromJson } from '@/shared/data/json-guards'

const personaAnalyzeSchema = z.object({
  score: z.number(),
  reasoning: z.string().optional(),
})

export const personaFidelityScorer = createScorer({
  id: 'persona-fidelity',
  name: 'Persona Fidelity',
  description: 'How well output matches a requested creative persona',
  judge: createJudgingConfig(
    'You evaluate persona fidelity in creative writing. Respond with valid JSON containing score (0-100) and reasoning.',
  ),
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
    const analyzed = recordFromJson(results.analyzeStepResult)
    return normalizeScore((readNumber(analyzed.score) ?? 0) / 100)
  })
  .generateReason(({ results, score }) => {
    const analyzed = recordFromJson(results.analyzeStepResult)
    return readString(analyzed.reasoning) ?? `Persona fidelity score: ${(score * 100).toFixed(0)}`
  })
