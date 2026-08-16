import { DISTINCT_N_VALUES, ScorerId } from './constants'
import { beatProse, tokenize } from './beat-text'
import type { DumpedBeat, StructuralScore } from './types'

function ngrams(tokens: string[], size: number): string[] {
  if (tokens.length < size) return []
  const grams: string[] = []
  for (let index = 0; index <= tokens.length - size; index += 1) {
    grams.push(tokens.slice(index, index + size).join(' '))
  }
  return grams
}

function distinctN(tokens: string[], size: number): number {
  const grams = ngrams(tokens, size)
  if (grams.length === 0) return 1
  return new Set(grams).size / grams.length
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a)
  const setB = new Set(b)
  let intersection = 0
  for (const gram of setA) {
    if (setB.has(gram)) intersection += 1
  }
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

export function scoreSelfRepetition(
  beats: readonly DumpedBeat[],
  otherRuns: readonly DumpedBeat[][] = [],
): StructuralScore {
  const tokens = tokenize(beats.map(beat => beatProse(beat)).join(' '))
  const distinct3 = distinctN(tokens, DISTINCT_N_VALUES[0])
  const distinct4 = distinctN(tokens, DISTINCT_N_VALUES[1])

  const thisGrams = ngrams(tokens, DISTINCT_N_VALUES[0])
  const pairwise: number[] = []
  for (const run of otherRuns) {
    const otherTokens = tokenize(run.map(beat => beatProse(beat)).join(' '))
    pairwise.push(jaccard(thisGrams, ngrams(otherTokens, DISTINCT_N_VALUES[0])))
  }
  const pairwiseMean =
    pairwise.length === 0 ? null : pairwise.reduce((sum, value) => sum + value, 0) / pairwise.length

  return {
    id: ScorerId.SelfRepetition,
    metrics: {
      distinct3,
      distinct4,
      pairwiseSimilarityMean: pairwiseMean,
      runCountCompared: pairwise.length,
    },
    flags: [],
  }
}
