import { BEAT_ONE, ScorerId } from './constants'
import type { DumpedBeat, StructuralScore } from './types'

function sequenceById(beats: readonly DumpedBeat[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const beat of beats) map.set(beat.id, beat.sequence)
  return map
}

export function scoreCausalGraph(beats: readonly DumpedBeat[]): StructuralScore {
  const ordered = [...beats].sort((a, b) => a.sequence - b.sequence)
  const sequences = sequenceById(ordered)
  const inDegree = new Map<string, number>()
  for (const beat of ordered) inDegree.set(beat.id, 0)

  let nonEmptyAfterFirst = 0
  let scoredAfterFirst = 0
  let multiDepCount = 0
  let orphanCount = 0
  let chainShape = ordered.length > 1
  const forwardFlags: Array<{ sequence: number; dependencyId: string }> = []

  for (const beat of ordered) {
    const deps = beat.causalDependencies
    if (beat.sequence !== BEAT_ONE) {
      scoredAfterFirst += 1
      if (deps.length > 0) nonEmptyAfterFirst += 1
      else orphanCount += 1
    }
    if (deps.length >= 2) multiDepCount += 1

    const previous = ordered.find(candidate => candidate.sequence === beat.sequence - 1)
    const onlyPrevious =
      deps.length === 1 && previous !== undefined && deps[0] === previous.id
    if (beat.sequence !== BEAT_ONE && !onlyPrevious) chainShape = false

    for (const depId of deps) {
      inDegree.set(depId, (inDegree.get(depId) ?? 0) + 1)
      const depSequence = sequences.get(depId)
      if (depSequence !== undefined && depSequence >= beat.sequence) {
        forwardFlags.push({ sequence: beat.sequence, dependencyId: depId })
      }
    }
  }

  const degrees = [...inDegree.values()]
  const maxInDegree = degrees.reduce((max, value) => (value > max ? value : max), 0)
  const shareNonEmpty = scoredAfterFirst === 0 ? 1 : nonEmptyAfterFirst / scoredAfterFirst

  return {
    id: ScorerId.CausalGraph,
    metrics: {
      shareNonEmptyCausal: shareNonEmpty,
      maxInDegree,
      multiDependencyCount: multiDepCount,
      orphanCount,
      forwardDependencyCount: forwardFlags.length,
      plainChain: chainShape,
    },
    flags: forwardFlags,
  }
}
