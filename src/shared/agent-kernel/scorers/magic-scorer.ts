import { createScorer } from '@mastra/core/evals'
import { z } from 'zod'
import { PromptRegistryName } from '@/shared/agent-kernel/prompts/constants/prompt-block-ids'
import { promptRepository } from '@/shared/agent-kernel/prompts/repository'
import { createJudgingConfig, normalizeScore, outputToString } from './shared'
import { compactScorerInput, compactScorerOutput } from './scorer-inspect'
import { evalInstrumentDescription } from '@/shared/agent-kernel/prompts/prompt-catalog-copy'
import { ScorerDescriptionBody } from './constants/scorer-descriptions'
import { readNumber, readString, recordFromJson } from '@/shared/data/json-guards'

const magicAnalyzeSchema = z.object({
  overallMagic: z.number(),
  critique: z.string(),
})

export const magicScorer = createScorer({
  id: 'magic',
  name: 'Magic Score',
  description: evalInstrumentDescription(ScorerDescriptionBody.Magic),
  judge: createJudgingConfig(
    'You are a ruthless creative writing critic.',
  ),
  prepareRun: run => ({
    ...run,
    input: compactScorerInput(run.input),
    output: compactScorerOutput(run.output),
  }),
})
  .analyze({
    description: 'Evaluate creative magic and slop patterns',
    outputSchema: magicAnalyzeSchema,
    createPrompt: async ({ run }) => {
      const content = outputToString(run.output)
      return promptRepository.getPrompt(PromptRegistryName.MagicJudge, { content })
    },
  })
  .generateScore(({ results }) => {
    const analyzed = recordFromJson(results.analyzeStepResult)
    const overallMagic = readNumber(analyzed.overallMagic) ?? 0
    return normalizeScore(overallMagic / 100)
  })
  .generateReason(({ results, score }) => {
    const analyzed = recordFromJson(results.analyzeStepResult)
    return readString(analyzed.critique) ?? `Magic score: ${(score * 100).toFixed(0)}`
  })
