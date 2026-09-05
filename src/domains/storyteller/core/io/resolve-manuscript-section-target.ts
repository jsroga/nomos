import {
  manuscriptSpanAt,
  type ManuscriptSpan,
} from '@/domains/storyteller/core/manuscript/manuscript-span'
import { nextUncoveredBeat } from '@/domains/storyteller/core/manuscript/next-uncovered-beat'
import { ManuscriptSectionScope } from '@/domains/storyteller/core/manuscript/pack-manuscript-section-brief'
import { beatCardFromJson, type BeatCard } from '@/domains/storyteller/core/types/story-types'
import type { ManuscriptMode } from '@/domains/storyteller/core/types/enums'

export { ManuscriptSectionScope }

export interface ManuscriptSectionTarget {
  beat: BeatCard
  span: ManuscriptSpan | null
  spanText: string
}

export function beatCardsFromRows(rows: unknown[]): BeatCard[] {
  return rows.map(row => beatCardFromJson(row))
}

export function resolveManuscriptSectionTarget(input: {
  beats: BeatCard[]
  scriptContent: string
  caret: number
  mode: ManuscriptMode
  scope: ManuscriptSectionScope
}): ManuscriptSectionTarget | null {
  const sorted = [...input.beats].sort((left, right) => left.sequence - right.sequence)
  const last = sorted[sorted.length - 1]
  if (last === undefined) return null

  if (input.scope === ManuscriptSectionScope.Regenerate) {
    const span = manuscriptSpanAt(input.scriptContent, input.caret, input.mode)
    const spanText =
      span === null ? '' : input.scriptContent.slice(span.start, span.end)
    const uncovered = nextUncoveredBeat(input.beats, input.scriptContent, input.mode)
    return { beat: uncovered ?? last, span, spanText }
  }

  const next = nextUncoveredBeat(input.beats, input.scriptContent, input.mode)
  return { beat: next ?? last, span: null, spanText: '' }
}
