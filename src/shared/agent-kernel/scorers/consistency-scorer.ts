import { createScorer } from '@mastra/core/evals'
import { stringArrayFromJson } from '@/shared/data/json-guards'
import { inputRecord, outputToString } from './shared'

export const consistencyScorer = createScorer({
  id: 'consistency',
  name: 'Consistency',
  description: 'Detect contradictions against established facts',
})
  .generateScore(({ run }) => {
    const facts = stringArrayFromJson(inputRecord(run.input).facts)
    const text = outputToString(run.output).toLowerCase()

    if (text.includes('alive') && facts.some(f => f.toLowerCase().includes('dead'))) {
      return 0
    }

    return 1
  })
  .generateReason(({ score }) =>
    score === 1
      ? 'No obvious inconsistencies found'
      : 'Consistency violations found: character described as alive but marked dead in facts'
  )
