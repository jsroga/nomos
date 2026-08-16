import { GRID_FILLING_VARIANCE_MAX, ScorerId } from './constants'
import { beatProse, tokenize } from './beat-text'
import type { DumpedBeat, StructuralScore } from './types'

function contentWords(text: string): Set<string> {
  return new Set(tokenize(text).filter(word => word.length > 2))
}

function overlap(a: Set<string>, b: Set<string>): number {
  let count = 0
  for (const word of a) {
    if (b.has(word)) count += 1
  }
  return count
}

function variance(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const squared = values.reduce((sum, value) => sum + (value - mean) ** 2, 0)
  return squared / values.length
}

export function scorePlanCoverage(
  beats: readonly DumpedBeat[],
  planPoints: readonly string[],
): StructuralScore {
  const pointWords = planPoints.map(point => contentWords(point))
  const counts = planPoints.map(() => 0)
  let unmapped = 0
  const assignments: Array<{ sequence: number; planPoint: number | null }> = []

  for (const beat of beats) {
    const words = contentWords(beatProse(beat))
    let bestIndex = -1
    let bestScore = 0
    for (let index = 0; index < pointWords.length; index += 1) {
      const pointSet = pointWords[index]
      if (!pointSet) continue
      const score = overlap(words, pointSet)
      if (score > bestScore) {
        bestScore = score
        bestIndex = index
      }
    }
    if (bestIndex < 0 || bestScore === 0) {
      unmapped += 1
      assignments.push({ sequence: beat.sequence, planPoint: null })
      continue
    }
    counts[bestIndex] = (counts[bestIndex] ?? 0) + 1
    assignments.push({ sequence: beat.sequence, planPoint: bestIndex + 1 })
  }

  const coverageVariance = variance(counts)
  const allCovered = counts.every(count => count > 0)
  const gridFillingSuspected =
    planPoints.length > 0 && allCovered && coverageVariance <= GRID_FILLING_VARIANCE_MAX

  return {
    id: ScorerId.PlanCoverage,
    metrics: {
      coverageVariance,
      unmappedCount: unmapped,
      gridFillingSuspected,
      planPointCount: planPoints.length,
    },
    flags: assignments,
  }
}
