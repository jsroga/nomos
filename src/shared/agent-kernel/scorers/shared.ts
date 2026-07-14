import { MODELS } from '@/shared/agent-kernel/models'
import { isPlainObject } from '@/shared/data/json-guards'
import { ScorerOutputField } from '@/shared/agent-kernel/scorers/constants/shared'

export function toMastraJudgingModel(): string {
  // Read at call time so evals/run.ts can load .env.local before scorer modules import.
  const model = process.env.JUDGING_MODEL || MODELS.judging.primary
  return model.replace(':', '/')
}

export function normalizeScore(score: number): number {
  return Math.max(0, Math.min(1, score))
}

export function outputToString(output: unknown): string {
  if (typeof output === 'string') return output
  if (output && typeof output === 'object' && ScorerOutputField.Response in output) {
    return String(output.response)
  }
  return JSON.stringify(output)
}

/**
 * Prose text from a workflow-step or eval output: accepts a raw string or the
 * beat-draft step records ({ draft } / { finalDraft }); falls back to JSON.
 */
export function extractProse(output: unknown): string {
  if (typeof output === 'string') return output
  if (output && typeof output === 'object') {
    if (ScorerOutputField.Draft in output && typeof output.draft === 'string') return output.draft
    if (ScorerOutputField.FinalDraft in output && typeof output.finalDraft === 'string') return output.finalDraft
  }
  return JSON.stringify(output ?? '')
}

export function inputRecord(input: unknown): Record<string, unknown> {
  if (isPlainObject(input)) return input
  return { value: input }
}
