import type { Finding } from '@/domains/storyteller/core/types/finding'
import type { BeatDraftCanon } from '@/domains/storyteller/core/types/beat-draft-canon'
import { checkCausalGraph } from './causal'
import { checkChapterHygiene } from './hygiene'
import { checkViewpointOverreach } from './viewpoint'

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((left, right) => {
    const typeOrder = left.problemType.localeCompare(right.problemType)
    if (typeOrder !== 0) return typeOrder
    return left.location.quote.localeCompare(right.location.quote)
  })
}

export function runSyncProseCheck(input: {
  draft: string
  canon: BeatDraftCanon
  characters: string[]
}): Finding[] {
  return sortFindings([
    ...checkCausalGraph(input.canon),
    ...checkChapterHygiene(input.draft),
    ...checkViewpointOverreach(input.draft, input.canon, input.characters),
  ])
}
