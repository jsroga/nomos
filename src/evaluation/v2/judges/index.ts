/**
 * V2 Judges Index
 *
 * Re-exports all judges for convenient importing.
 */

// Magic & Beauty
export {
  MagicScoreJudge,
  EmotionalResonanceJudge,
  MemorableMomentsJudge,
} from './magic-score-judge'

// Anti-Slop
export {
  AntiSlopJudge,
  AuthenticityJudge,
  ClicheJudge,
  SLOP_PATTERNS,
} from './anti-slop-judge'

// Consistency
export {
  StoryConsistencyJudge,
  CharacterVoiceJudge,
  WorldLogicJudge,
  CompositeConsistencyJudge,
} from './consistency-judge'
