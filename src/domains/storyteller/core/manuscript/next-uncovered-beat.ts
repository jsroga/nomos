import { countManuscriptSpans } from '@/domains/storyteller/core/manuscript/manuscript-span'
import type { BeatCard } from '@/domains/storyteller/core/types/story-types'
import type { ManuscriptMode } from '@/domains/storyteller/core/types/enums'

export function nextUncoveredBeat(
  beats: BeatCard[],
  scriptContent: string,
  mode: ManuscriptMode
): BeatCard | null {
  const sorted = [...beats].sort((left, right) => left.sequence - right.sequence)
  const first = sorted[0]
  if (first === undefined) return null
  if (scriptContent.trim().length === 0) return first
  const covered = countManuscriptSpans(scriptContent, mode)
  const next = sorted[covered]
  return next ?? null
}
