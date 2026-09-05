export enum PairwiseSide {
  Left = 'left',
  Right = 'right',
  Tie = 'tie',
}

export enum PairwiseLabel {
  A = 'a',
  B = 'b',
  Tie = 'tie',
}

export enum PairwiseOrder {
  Ab = 'ab',
  Ba = 'ba',
}

export function flipPair<T>(left: T, right: T): [T, T] {
  return [right, left]
}

export function labelFromPresentation(
  choice: PairwiseSide,
  order: PairwiseOrder
): PairwiseLabel {
  if (choice === PairwiseSide.Tie) return PairwiseLabel.Tie
  if (order === PairwiseOrder.Ab) {
    return choice === PairwiseSide.Left ? PairwiseLabel.A : PairwiseLabel.B
  }
  return choice === PairwiseSide.Left ? PairwiseLabel.B : PairwiseLabel.A
}

/** Disagreeing presentations (including position bias) resolve to a tie. */
export function resolvePairwise(
  abChoice: PairwiseSide,
  baChoice: PairwiseSide
): PairwiseLabel {
  const first = labelFromPresentation(abChoice, PairwiseOrder.Ab)
  const second = labelFromPresentation(baChoice, PairwiseOrder.Ba)
  if (first !== second) return PairwiseLabel.Tie
  return first
}

export interface PairwiseTrial {
  ab: PairwiseSide
  ba: PairwiseSide
}

export function pairwiseFlipRate(trials: readonly PairwiseTrial[]): number {
  if (trials.length === 0) return 0
  let flips = 0
  for (const trial of trials) {
    const first = labelFromPresentation(trial.ab, PairwiseOrder.Ab)
    const second = labelFromPresentation(trial.ba, PairwiseOrder.Ba)
    if (first !== second) flips += 1
  }
  return flips / trials.length
}
