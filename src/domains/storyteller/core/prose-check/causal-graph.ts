/** Causal graph scoring for the cheap beat-draft linter. Copied into domain core so src/ never imports evals/. */

export interface CausalBeat {
  id: string
  sequence: number
  causalDependencies: string[]
  beatType: string | null
}

export interface CausalGraphScore {
  orphanCount: number
  forwardFlags: Array<{ sequence: number; beatId: string; dependencyId: string }>
  inDegree: Map<string, number>
  maxSequence: number
}

const FIRST_SEQUENCE = 1

export function scoreCausalGraph(beats: readonly CausalBeat[]): CausalGraphScore {
  const ordered = [...beats].sort((a, b) => a.sequence - b.sequence)
  const sequences = new Map<string, number>()
  for (const beat of ordered) sequences.set(beat.id, beat.sequence)

  const inDegree = new Map<string, number>()
  for (const beat of ordered) inDegree.set(beat.id, 0)

  let orphanCount = 0
  const forwardFlags: Array<{ sequence: number; beatId: string; dependencyId: string }> = []

  for (const beat of ordered) {
    const deps = beat.causalDependencies
    if (beat.sequence !== FIRST_SEQUENCE && deps.length === 0) orphanCount += 1

    for (const depId of deps) {
      inDegree.set(depId, (inDegree.get(depId) ?? 0) + 1)
      const depSequence = sequences.get(depId)
      if (depSequence !== undefined && depSequence >= beat.sequence) {
        forwardFlags.push({ sequence: beat.sequence, beatId: beat.id, dependencyId: depId })
      }
    }
  }

  const maxSequence = ordered.reduce((max, beat) => (beat.sequence > max ? beat.sequence : max), 0)
  return { orphanCount, forwardFlags, inDegree, maxSequence }
}
