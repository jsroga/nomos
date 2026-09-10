import { isPlainObject } from '@/shared/data/json-guards'
import {
  SCORER_INSPECT_MAX_EXCERPT,
  ScorerInspectField,
  ScorerInspectMarker,
} from './constants/inspect'
import { extractProse } from './shared'

function stripIq200(text: string): string {
  const index = text.indexOf(ScorerInspectMarker.Iq200)
  if (index === -1) return text
  return text.slice(0, index).trim()
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const parts: string[] = []
    for (const part of content) {
      if (!isPlainObject(part)) continue
      const text = part[ScorerInspectField.Text]
      if (typeof text === 'string') parts.push(text)
    }
    return parts.join('\n')
  }
  if (isPlainObject(content)) {
    const text = content[ScorerInspectField.Text]
    if (typeof text === 'string') return text
  }
  return ''
}

function lastUserAsk(messages: unknown): string {
  if (!Array.isArray(messages)) return ''
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const row = messages[index]
    if (!isPlainObject(row)) continue
    if (row[ScorerInspectField.Role] !== ScorerInspectField.User) continue
    return stripIq200(contentToText(row[ScorerInspectField.Content]))
  }
  return ''
}

export function compactScorerInput(input: unknown): Record<string, unknown> {
  if (!isPlainObject(input)) {
    return { value: typeof input === 'string' ? stripIq200(input) : input }
  }
  const messages = input[ScorerInspectField.InputMessages]
  const ask = lastUserAsk(messages)
  const message =
    typeof input[ScorerInspectField.Message] === 'string'
      ? stripIq200(input[ScorerInspectField.Message])
      : ask
  const compact: Record<string, unknown> = {}
  if (message) compact[ScorerInspectField.Message] = message
  if (input.facts !== undefined) compact.facts = input.facts
  if (input.canon !== undefined) compact.canon = input.canon
  if (input.persona !== undefined) compact.persona = input.persona
  return compact
}

export function compactScorerOutput(output: unknown): string {
  if (Array.isArray(output)) {
    for (let index = output.length - 1; index >= 0; index -= 1) {
      const row = output[index]
      if (!isPlainObject(row)) continue
      if (row[ScorerInspectField.Role] === ScorerInspectField.Assistant) {
        return stripIq200(contentToText(row[ScorerInspectField.Content]))
      }
    }
  }
  return stripIq200(extractProse(output))
}

export function prepareScorerRun<TInput, TOutput>(run: {
  input?: TInput
  output: TOutput
  groundTruth?: unknown
}): {
  input: Record<string, unknown>
  output: string
  groundTruth?: unknown
} {
  return {
    input: compactScorerInput(run.input),
    output: compactScorerOutput(run.output),
    groundTruth: run.groundTruth,
  }
}

export function formatDefaultScorerInspect(args: {
  id: string
  description: string
  rubric: string
  excerpt: string
  score?: number
  reason?: string
}): string {
  const excerpt =
    args.excerpt.length > SCORER_INSPECT_MAX_EXCERPT
      ? args.excerpt.slice(0, SCORER_INSPECT_MAX_EXCERPT)
      : args.excerpt
  const scoreLine =
    args.score === undefined ? '' : `\nScore: ${args.score}\nReason: ${args.reason ?? ''}`
  return `Instrument: ${args.id}\n${args.description}\n\n${args.rubric}\n\nExcerpt:\n${excerpt}${scoreLine}`
}
