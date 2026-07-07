import { MODELS } from '@/shared/agent-kernel/models'

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
  if (output && typeof output === 'object' && 'response' in output) {
    return String((output as { response: unknown }).response)
  }
  return JSON.stringify(output)
}

export function inputRecord(input: unknown): Record<string, unknown> {
  if (input && typeof input === 'object') return input as Record<string, unknown>
  return { value: input }
}
