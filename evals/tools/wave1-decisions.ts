/** Wave 1 promotion outcomes. Extras ship only on Go. */

export enum PromotionDecision {
  Go = 'go',
  NoGo = 'no-go',
}

export enum Wave1PromotionTarget {
  ExtraCognitionCritic = 'extra-cognition-critic',
  ExtraDialogueCritic = 'extra-dialogue-critic',
  ManuscriptEmbeddingSearch = 'manuscript-embedding-search',
  KnowledgeLedger = 'knowledge-ledger',
  FictionAdjustedHumanizer = 'fiction-adjusted-humanizer',
}

/** Recorded from evals/__tests__/wave1-promotion-floor.test.ts. */
export const WAVE1_PROMOTION_DECISIONS = {
  [Wave1PromotionTarget.ExtraCognitionCritic]: PromotionDecision.NoGo,
  [Wave1PromotionTarget.ExtraDialogueCritic]: PromotionDecision.Go,
  [Wave1PromotionTarget.ManuscriptEmbeddingSearch]: PromotionDecision.Go,
  [Wave1PromotionTarget.KnowledgeLedger]: PromotionDecision.Go,
  [Wave1PromotionTarget.FictionAdjustedHumanizer]: PromotionDecision.NoGo,
} as const
