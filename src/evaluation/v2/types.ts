/**
 * Evaluation V2 Types
 *
 * Langfuse LLM-as-Judge evaluation system for storyteller and game loop modules.
 * Based on research from arxiv.org/html/2312.06281v2 and LLM-as-Judge best practices.
 */

import { z } from 'zod'

// ============================================================================
// Score Definitions
// ============================================================================

export const ScoreNames = {
  // Magic & Beauty
  MAGIC_SCORE: 'magic_score',
  EMOTIONAL_RESONANCE: 'emotional_resonance',
  MEMORABLE_MOMENTS: 'memorable_moments',

  // Anti-Slop
  ANTI_SLOP: 'anti_slop',
  CLICHE_DENSITY: 'cliche_density',
  AUTHENTICITY: 'authenticity',

  // Consistency & Understanding
  STORY_CONSISTENCY: 'story_consistency',
  CHARACTER_CONSISTENCY: 'character_consistency',
  WORLD_LOGIC: 'world_logic',

  // Narrative Quality
  NARRATIVE_COHERENCE: 'narrative_coherence',
  TENSION_PACING: 'tension_pacing',
  DIALOGUE_QUALITY: 'dialogue_quality',

  // Composite
  OVERALL_QUALITY: 'overall_quality',
} as const

export type ScoreName = typeof ScoreNames[keyof typeof ScoreNames]

// ============================================================================
// Judge Configuration
// ============================================================================

export interface JudgeConfig {
  /** Model to use for evaluation (e.g., 'gpt-4o', 'claude-3-opus') */
  model: string
  /** Temperature for LLM calls (0 for deterministic) */
  temperature: number
  /** Whether to use structured output */
  structuredOutput: boolean
  /** Maximum tokens for response */
  maxTokens?: number
  /** Whether to include chain-of-thought reasoning */
  includeReasoning: boolean
}

export const DEFAULT_JUDGE_CONFIG: JudgeConfig = {
  model: 'gpt-4o',
  temperature: 0,
  structuredOutput: true,
  maxTokens: 2000,
  includeReasoning: true,
}

// ============================================================================
// Evaluation Schemas
// ============================================================================

/** Base schema for all judge results */
export const JudgeResultSchema = z.object({
  score: z.number().min(0).max(1),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).optional(),
})

/** Magic Score dimensions - tracking beautiful human moments */
export const MagicScoreSchema = z.object({
  // Core dimensions (0-100 scale, normalized to 0-1)
  emotionalTruth: z.number().min(0).max(100).describe('Authentic emotional moments that ring true'),
  unexpectedBeauty: z.number().min(0).max(100).describe('Surprising moments of grace or meaning'),
  characterRevelation: z.number().min(0).max(100).describe('Moments that reveal deep character truth'),
  thematicResonance: z.number().min(0).max(100).describe('How well themes echo and amplify'),
  lingering: z.number().min(0).max(100).describe('Moments that stay with you after reading'),

  // Sparks - specific beautiful moments found
  sparks: z.array(z.object({
    quote: z.string(),
    type: z.enum(['emotional_truth', 'unexpected_beauty', 'character_revelation', 'thematic_echo', 'haunting']),
    impact: z.number().min(1).max(10),
    explanation: z.string(),
  })),

  // Reference comparisons
  evokes: z.array(z.string()).describe('What great works this evokes (e.g., "Red Dead Redemption ending", "Breaking Bad face-off")'),

  // Overall
  overallMagic: z.number().min(0).max(100),
  critique: z.string(),
})

/** Anti-Slop dimensions - detecting AI clichés and filler */
export const AntiSlopSchema = z.object({
  // Detection categories
  slopInstances: z.array(z.object({
    text: z.string(),
    category: z.enum([
      'hedging', // "It's important to note that..."
      'filler', // "In order to", "As mentioned"
      'cliche_phrase', // "At the end of the day"
      'purple_prose', // Overwrought description
      'telling_not_showing', // Explaining emotions instead of demonstrating
      'ai_pattern', // Distinctly AI-sounding constructions
      'redundancy', // Saying the same thing twice
      'weak_verbs', // Overuse of "was", "had", "seemed"
      'empty_intensifier', // "very", "really", "quite"
      'vague_description', // Generic instead of specific
    ]),
    severity: z.enum(['minor', 'moderate', 'severe']),
    suggestion: z.string().optional(),
  })),

  // Scores (inverse - higher is better, less slop)
  clarityScore: z.number().min(0).max(100).describe('How clear and direct the writing is'),
  specificityScore: z.number().min(0).max(100).describe('How specific vs generic'),
  voiceScore: z.number().min(0).max(100).describe('How distinctive the voice is'),
  economyScore: z.number().min(0).max(100).describe('Efficiency - every word earns its place'),

  // Overall
  overallAntiSlop: z.number().min(0).max(100),
  slopDensity: z.number().describe('Slop instances per 100 words'),
  critique: z.string(),
})

/** Story Consistency dimensions */
export const ConsistencySchema = z.object({
  // Fact tracking
  factViolations: z.array(z.object({
    fact: z.string(),
    violation: z.string(),
    severity: z.enum(['minor', 'moderate', 'critical']),
    location: z.string().optional(),
  })),

  // Character consistency
  characterViolations: z.array(z.object({
    character: z.string(),
    aspect: z.enum(['voice', 'motivation', 'knowledge', 'ability', 'relationship']),
    violation: z.string(),
    severity: z.enum(['minor', 'moderate', 'critical']),
  })),

  // World logic
  worldViolations: z.array(z.object({
    rule: z.string(),
    violation: z.string(),
    severity: z.enum(['minor', 'moderate', 'critical']),
  })),

  // Timeline
  timelineViolations: z.array(z.object({
    issue: z.string(),
    severity: z.enum(['minor', 'moderate', 'critical']),
  })),

  // Scores
  factConsistency: z.number().min(0).max(100),
  characterConsistency: z.number().min(0).max(100),
  worldConsistency: z.number().min(0).max(100),
  timelineConsistency: z.number().min(0).max(100),

  // Overall
  overallConsistency: z.number().min(0).max(100),
  critique: z.string(),
})

// ============================================================================
// Evaluation Context
// ============================================================================

export interface StorytellerContext {
  /** Series bible / world building */
  seriesBible?: {
    title?: string
    genre?: string[]
    centralTheme?: string
    tone?: string
    worldRules?: string[]
  }

  /** Characters with their established traits */
  characters?: Array<{
    name: string
    role: string
    voice?: string
    motivation?: string
    relationships?: string[]
    currentState?: string
  }>

  /** Previously established facts */
  establishedFacts?: string[]

  /** Previous beats/scenes for consistency */
  previousBeats?: Array<{
    logline: string
    characters: string[]
    outcome?: string
  }>

  /** Current episode context */
  episodeContext?: {
    premise?: string
    targetEmotion?: string
    storyPhase?: string
  }
}

// ============================================================================
// Evaluation Items
// ============================================================================

export interface EvaluationItem {
  id: string
  input: string
  output: string
  context?: StorytellerContext
  expectedOutput?: string
  metadata?: Record<string, any>
}

export interface EvaluationResult {
  itemId: string
  scores: Record<ScoreName, number>
  details: Record<ScoreName, any>
  passed: boolean
  error?: string
}

// ============================================================================
// Judge Interface
// ============================================================================

export interface JudgeOutput<T = any> {
  score: number
  scoreName: ScoreName
  reasoning: string
  confidence: number
  details: T
  evidence?: string[]
}

export interface Judge<TInput = any, TOutput = any> {
  name: string
  scoreName: ScoreName
  config: JudgeConfig

  evaluate(
    input: string,
    output: string,
    context?: StorytellerContext,
    expected?: string
  ): Promise<JudgeOutput<TOutput>>
}

export type MagicScoreOutput = z.infer<typeof MagicScoreSchema>
export type AntiSlopOutput = z.infer<typeof AntiSlopSchema>
export type ConsistencyOutput = z.infer<typeof ConsistencySchema>
