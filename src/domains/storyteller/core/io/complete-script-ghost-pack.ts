import { BeatboardPremiseFieldKey } from '@/domains/storyteller/core/constants/beatboard-premise-validation'
import { episodePremiseFromPlan } from '@/domains/storyteller/core/utils/validate-premise-for-beatboard'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import type { BeatDraftCanonBeat } from '@/domains/storyteller/core/types/beat-draft-canon'
import { readString } from '@/shared/data/json-guards'

export enum ScriptGhostCopy {
  System =
    'Continue the manuscript with one sentence. Do not rewrite the prefix. Match the requested format. Do not run critiques.',
  FormatLinePrefix = 'Format: ',
}

export function scriptGhostSystemPrompt(mode: ManuscriptMode): string {
  return `${ScriptGhostCopy.System}\n${ScriptGhostCopy.FormatLinePrefix}${mode}`
}

export enum ScriptGhostHonorific {
  Dr = 'Dr.',
  Mr = 'Mr.',
  Mrs = 'Mrs.',
  Ms = 'Ms.',
  Prof = 'Prof.',
}

const SENTENCE_END = /[.!?]/
const SPACE_THEN_CAPITAL = /^\s+[A-Z]/

function endsWithHonorific(sentence: string): boolean {
  const trimmed = sentence.trimEnd()
  for (const honorific of Object.values(ScriptGhostHonorific)) {
    if (!trimmed.endsWith(honorific)) continue
    const before = trimmed.slice(0, trimmed.length - honorific.length)
    if (before.length === 0 || /\s$/.test(before)) return true
  }
  return false
}

/** First sentence only: `.!?` then space+capital or newline. Skips Dr./Mr. */
export function clipScriptGhostToFirstSentence(text: string): string {
  const leadLength = text.length - text.trimStart().length
  const lead = text.slice(0, leadLength)
  const input = text.slice(leadLength)
  if (input.length === 0) return ''
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    if (!ch || !SENTENCE_END.test(ch)) continue
    const sentence = input.slice(0, i + 1)
    if (endsWithHonorific(sentence)) continue
    const rest = input.slice(i + 1)
    if (rest.length === 0) return `${lead}${sentence.trimEnd()}`
    if (rest.startsWith('\n')) return `${lead}${sentence.trimEnd()}`
    if (SPACE_THEN_CAPITAL.test(rest)) return `${lead}${sentence.trimEnd()}`
  }
  return `${lead}${input}`
}

export function involvedNamesFromCoveringBeats(beats: readonly BeatDraftCanonBeat[]): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const beat of beats) {
    for (const name of beat.charactersInvolved ?? []) {
      const trimmed = name.trim()
      if (trimmed.length === 0) continue
      const key = trimmed.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      names.push(trimmed)
    }
  }
  return names
}

export function episodePremiseText(premise: string | null | undefined, storyPlan: unknown): string {
  const fromColumn = premise?.trim() ?? ''
  if (fromColumn.length > 0) return fromColumn
  const fromPlan = episodePremiseFromPlan(storyPlan)
  if (!fromPlan) return ''
  return readString(fromPlan[BeatboardPremiseFieldKey.Logline]) ?? ''
}
