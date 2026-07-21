/**
 * Extract an idea set from a Mastra scorer run (`{ input, output }`). Shared by
 * the deterministic `ideaUniquenessScorer` and the LLM `ideaDiversityJudgeScorer`
 * so both read fixtures the same way: prefer `input.ideas` / `output.ideas`
 * (string[]), else split newline-separated ideas out of the output text.
 */

import { isPlainObject, stringArrayFromJson } from '@/shared/data/json-guards'
import { outputToString } from './shared'

const IDEAS_KEY = 'ideas'
const NUMBERED_LINE_PREFIX = /^\d+[.)]\s*/

export function extractIdeaSet(input: unknown, output: unknown): string[] {
  if (isPlainObject(input) && IDEAS_KEY in input) {
    const fromInput = stringArrayFromJson(input.ideas)
    if (fromInput.length > 0) return fromInput
  }
  if (isPlainObject(output) && IDEAS_KEY in output) {
    const fromOutput = stringArrayFromJson(output.ideas)
    if (fromOutput.length > 0) return fromOutput
  }
  return outputToString(output)
    .split('\n')
    .map(line => line.replace(NUMBERED_LINE_PREFIX, '').trim())
    .filter(Boolean)
}
