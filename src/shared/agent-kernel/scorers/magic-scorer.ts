import { createScorer } from '@mastra/core/evals'
import { z } from 'zod'
import { promptRepository } from '@/shared/agent-kernel/prompts/repository'
import { normalizeScore, outputToString, toMastraJudgingModel } from './shared'

const magicAnalyzeSchema = z.object({
  overallMagic: z.number(),
  critique: z.string().optional(),
})

export const magicScorer = createScorer({
  id: 'magic',
  name: 'Magic Score',
  description: 'Creative quality, originality, and anti-slop evaluation',
  judge: {
    model: toMastraJudgingModel(),
    instructions:
      'You are a ruthless creative writing critic. Respond with valid JSON matching the requested schema.',
  },
})
  .analyze({
    description: 'Evaluate creative magic and slop patterns',
    outputSchema: magicAnalyzeSchema,
    createPrompt: async ({ run }) => {
      const content = outputToString(run.output)
      return promptRepository.getPrompt('magic-judge', { content })
    },
  })
  .generateScore(({ results }) => {
    const analyzed = results.analyzeStepResult as { overallMagic?: number } | undefined
    const overallMagic = analyzed?.overallMagic ?? 0
    return normalizeScore(overallMagic / 100)
  })
  .generateReason(({ results, score }) => {
    const analyzed = results.analyzeStepResult as { critique?: string } | undefined
    return analyzed?.critique ?? `Magic score: ${(score * 100).toFixed(0)}`
  })
