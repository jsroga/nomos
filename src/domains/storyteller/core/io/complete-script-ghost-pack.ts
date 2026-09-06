import { BeatboardPremiseFieldKey } from '@/domains/storyteller/core/constants/beatboard-premise-validation'
import { episodePremiseFromPlan } from '@/domains/storyteller/core/utils/validate-premise-for-beatboard'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import type { BeatDraftCanonBeat } from '@/domains/storyteller/core/types/beat-draft-canon'
import { readString } from '@/shared/data/json-guards'

export enum ScriptGhostCopy {
  System =
    'Continue the manuscript with one sentence or a short paragraph. Do not rewrite the prefix. Match the requested format. Do not run critiques.',
  FormatLinePrefix = 'Format: ',
}

export function scriptGhostSystemPrompt(mode: ManuscriptMode): string {
  return `${ScriptGhostCopy.System}\n${ScriptGhostCopy.FormatLinePrefix}${mode}`
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
