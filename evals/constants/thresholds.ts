/**
 * How far a scorer may drop before it counts as a regression.
 *
 * `threshold = max(2σ, REGRESSION_FLOOR)`, where σ is the run-to-run standard
 * deviation measured by `npx tsx evals/measure-noise.ts` over an unchanged
 * tree. A hard `>=` on a stochastic judge fails constantly, and a gate that
 * cries wolf gets bypassed — which is how the unenforced sentence in CLAUDE.md
 * became the status quo.
 *
 * **A σ of 0 from an LLM judge means "no variation in three runs", not
 * "deterministic".** Three of these scorers are genuinely deterministic (a
 * regex or a structural check); the rest are judges whose golden examples are
 * unambiguous enough to land identically. The floor is what stops that zero
 * from becoming a hair-trigger.
 */

/**
 * The smallest drop worth calling a regression, whatever σ says. A scorer with
 * σ = 0.001 would otherwise gate on a 0.003 drift — below what the scorer can
 * resolve. Measured σ ranges from 0 to 0.022 over 3 runs, so this floor is
 * load-bearing for six of the eight.
 */
export const REGRESSION_FLOOR = 0.02

/** Multiples of σ tolerated before a drop is called a regression. */
export const SIGMA_MULTIPLE = 2

/**
 * How much more than the baseline a run may cost before the gate refuses. A
 * prompt that doubled in length scores the same and bills twice, which no
 * scorer delta would catch.
 */
export const COST_BUDGET_MULTIPLE = 1.1

export enum ScorerKind {
  /** A regex or structural check: σ = 0 by construction. */
  Deterministic = 'deterministic',
  /** An LLM judge: σ = 0 means unobserved variation, not none. */
  LlmJudge = 'llm-judge',
}

export interface ScorerThreshold {
  /** Measured run-to-run standard deviation. */
  sigma: number
  kind: ScorerKind
  /** How many runs that σ came from — 3 is a small sample and is stated. */
  sigmaRuns: number
}

/** From `evals/baselines/noise.2026-08-28.json`. Re-measure after a judge change. */
export const SCORER_NOISE: Readonly<Record<string, ScorerThreshold>> = {
  magic: { sigma: 0.0220, kind: ScorerKind.LlmJudge, sigmaRuns: 3 },
  hallucination: { sigma: 0.0157, kind: ScorerKind.LlmJudge, sigmaRuns: 3 },
  'persona-fidelity': { sigma: 0.0057, kind: ScorerKind.LlmJudge, sigmaRuns: 3 },
  'prose-craft': { sigma: 0, kind: ScorerKind.LlmJudge, sigmaRuns: 3 },
  'story-motion': { sigma: 0, kind: ScorerKind.LlmJudge, sigmaRuns: 3 },
  consistency: { sigma: 0, kind: ScorerKind.Deterministic, sigmaRuns: 3 },
  'critic-discipline': { sigma: 0, kind: ScorerKind.Deterministic, sigmaRuns: 3 },
  'beat-plan-concreteness': { sigma: 0, kind: ScorerKind.Deterministic, sigmaRuns: 3 },
}

/**
 * The drop this scorer must exceed to fail the gate. An unknown scorer — one
 * added since the last noise measurement — gets the floor, so it gates rather
 * than passing silently.
 */
export function regressionThreshold(scorerId: string): number {
  const noise = SCORER_NOISE[scorerId]
  if (!noise) return REGRESSION_FLOOR
  return Math.max(SIGMA_MULTIPLE * noise.sigma, REGRESSION_FLOOR)
}
