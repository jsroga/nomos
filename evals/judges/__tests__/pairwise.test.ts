import { describe, expect, it } from 'vitest'
import {
  flipPair,
  pairwiseFlipRate,
  PairwiseLabel,
  PairwiseSide,
  resolvePairwise,
} from '../pairwise'

describe('pairwise judge counterbalance', () => {
  it('flips presentation order', () => {
    expect(flipPair('alpha', 'beta')).toEqual(['beta', 'alpha'])
  })

  it('treats a flip as a tie', () => {
    expect(resolvePairwise(PairwiseSide.Left, PairwiseSide.Left)).toBe(PairwiseLabel.Tie)
    expect(resolvePairwise(PairwiseSide.Right, PairwiseSide.Right)).toBe(PairwiseLabel.Tie)
  })

  it('keeps a consistent candidate across both orders', () => {
    expect(resolvePairwise(PairwiseSide.Left, PairwiseSide.Right)).toBe(PairwiseLabel.A)
    expect(resolvePairwise(PairwiseSide.Right, PairwiseSide.Left)).toBe(PairwiseLabel.B)
  })

  it('reports flip rate', () => {
    const rate = pairwiseFlipRate([
      { ab: PairwiseSide.Left, ba: PairwiseSide.Left },
      { ab: PairwiseSide.Left, ba: PairwiseSide.Right },
    ])
    expect(rate).toBe(0.5)
  })
})
