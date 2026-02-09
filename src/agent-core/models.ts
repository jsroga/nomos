/**
 * CENTRAL MODEL CONFIGURATION
 *
 * ONE FILE TO RULE THEM ALL.
 * Every model used anywhere in the system is configured here.
 */

import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'

// =============================================================================
// MODEL REGISTRY - All models defined in one place
// =============================================================================

export const MODELS = {
  // === GENERATION MODELS (for creating content) ===
  generation: {
    primary: process.env.GENERATION_MODEL || 'openai:gpt-4o',
    fast: process.env.GENERATION_MODEL_FAST || 'openai:gpt-4o-mini',
    creative: process.env.GENERATION_MODEL_CREATIVE || 'openai:gpt-4o',
  },

  // === JUDGING MODELS (for evaluation - independent layer) ===
  judging: {
    primary: process.env.JUDGING_MODEL || 'openai:gpt-4o',
    fallback: process.env.JUDGING_MODEL_FALLBACK || 'openai:gpt-4o-mini',
    // Low temperature for consistent judging
    temperature: 0.1,
  },

  // === PLANNING MODELS (for reasoning/planning) ===
  planning: {
    primary: process.env.PLANNING_MODEL || 'openai:gpt-4o',
    reasoning: process.env.PLANNING_MODEL_REASONING || 'openai:o1-preview',
  },

  // === EMBEDDING MODELS ===
  embedding: {
    primary: process.env.EMBEDDING_MODEL || 'openai:text-embedding-3-small',
  },
} as const

// =============================================================================
// SELF-IMPROVEMENT LOOP CONFIG
// =============================================================================

export const IMPROVEMENT_LOOP = {
  maxIterations: Number(process.env.IMPROVEMENT_MAX_ITERATIONS) || 5,
  qualityThreshold: Number(process.env.IMPROVEMENT_QUALITY_THRESHOLD) || 0.85,
  minImprovementDelta: 0.02,
  earlyExitOnRegression: true,
  /** Exit if score doesn't improve by minDelta for this many consecutive iterations */
  earlyExitOnPlateau: true,
  /** How many flat iterations before plateau exit */
  plateauWindow: 2,
} as const

// =============================================================================
// MODEL FACTORY - Creates model instances
// =============================================================================

/**
 * Create model for Mastra agents (requires specificationVersion: 'v2')
 */
export function createModel(modelName: string) {
  // OpenAI
  if (modelName.startsWith('openai:')) {
    const modelId = modelName.replace('openai:', '')
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const model = openai(modelId)
    ;(model as any).specificationVersion = 'v2' // Mastra compatibility
    return model
  }

  // Anthropic
  if (modelName.startsWith('anthropic:')) {
    const modelId = modelName.replace('anthropic:', '')
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const model = anthropic(modelId)
    ;(model as any).specificationVersion = 'v2'
    return model
  }

  // Google
  if (modelName.startsWith('google:')) {
    const modelId = modelName.replace('google:', '')
    const model = google(modelId)
    ;(model as any).specificationVersion = 'v2'
    return model
  }

  // Default fallback
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai('gpt-4o')
}

/**
 * Create model for pure AI SDK usage (generateObject, generateText)
 * Does NOT set specificationVersion - uses native AI SDK behavior
 */
export function createPureModel(modelName: string) {
  // OpenAI
  if (modelName.startsWith('openai:')) {
    const modelId = modelName.replace('openai:', '')
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    return openai(modelId)
  }

  // Anthropic
  if (modelName.startsWith('anthropic:')) {
    const modelId = modelName.replace('anthropic:', '')
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    return anthropic(modelId)
  }

  // Google
  if (modelName.startsWith('google:')) {
    const modelId = modelName.replace('google:', '')
    return google(modelId)
  }

  // Default fallback
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai('gpt-4o')
}

// =============================================================================
// CONVENIENCE GETTERS
// =============================================================================

/** Get model for content generation - uses pure AI SDK */
export const getGenerationModel = (tier: 'primary' | 'fast' | 'creative' = 'primary') =>
  createPureModel(MODELS.generation[tier])

/** Get model for judging/evaluation (independent layer) - uses pure AI SDK */
export const getJudgingModel = (tier: 'primary' | 'fallback' = 'primary') =>
  createPureModel(MODELS.judging[tier])

/** Get model for planning/reasoning */
const getPlanningModel = (tier: 'primary' | 'reasoning' = 'primary') =>
  createModel(MODELS.planning[tier])

// =============================================================================
// THE MAZUR FRAMEWORK - Why These Three Masters?
// =============================================================================
//
// These three creators form a COMPLETE storytelling triangle:
//
//                    DEPTH (GRRM)
//                        △
//                       /  \
//                      /    \
//                     /      \
//        STRUCTURE ◁──────────▷ FEELING
//        (Gilligan)              (Lynch)
//
// Each catches what the others miss:
// - GRRM: "Is this REAL?" - catches shallow characters, convenient plots
// - GILLIGAN: "Does this WORK?" - catches illogical sequences, weak visuals
// - LYNCH: "Does this HAUNT?" - catches lack of atmosphere, over-explanation
//
// AI slop fails ALL THREE:
// - Slop has no depth (generic characters, no consequences)
// - Slop has no structure (things happen "because plot")
// - Slop has no feeling (explains everything, no mystery)
//
// =============================================================================

export const PERSONAS = {
  'george-rr-martin': {
    name: 'George R.R. Martin',
    alias: 'The Gardener',
    dimension: 'DEPTH',
    question: 'Is this REAL?',
    magic:
      'The human heart in conflict with itself. Characters want contradicting things. Actions have brutal consequences. The world is ancient and textured.',
    focus: [
      'gray morality - no pure heroes or villains',
      'consequences - stupid mistakes = suffering',
      'texture - food, heraldry, rust on armor',
      'political intrigue - power corrupts realistically',
    ],
    hates: [
      'plot armor - protagonist survives because protagonist',
      'black-and-white morality - obvious good vs evil',
      'convenient coincidences - saved by luck',
      'characters without history or grudges',
    ],
    slopSignals: [
      'character does something "out of character" for plot',
      'consequences disappear when inconvenient',
      'world feels generic, no lived-in texture',
      'everyone agrees too easily',
    ],
    voice: 'Melancholic, cynical, richly detailed',
  },

  'vince-gilligan': {
    name: 'Vince Gilligan',
    alias: 'The Architect',
    dimension: 'STRUCTURE',
    question: 'Does this WORK?',
    magic:
      'Mr. Chips to Scarface. Every frame tells the story. Cause leads to effect with mathematical precision. The check always comes due.',
    focus: [
      'visual metaphor - show dont tell, camera angles matter',
      'transformation - track the moral decay step by step',
      'rigorous logic - no "because plot needs it"',
      'irony - victory tastes like ash',
    ],
    hates: [
      'deus ex machina - saved by coincidence',
      'unmotivated action - doing things for no reason',
      'telling over showing - explaining emotions',
      'broken continuity - forgetting what happened',
    ],
    slopSignals: [
      'character explains their feelings instead of showing',
      'solution appears from nowhere',
      'timeline/continuity errors',
      'actions without consequences',
    ],
    voice: 'Tense, observant, cinematic',
  },

  'david-lynch': {
    name: 'David Lynch',
    alias: 'The Dreamer',
    dimension: 'FEELING',
    question: 'Does this HAUNT?',
    magic:
      'The mundane is terrifying. Things make emotional sense, not rational sense. The mystery IS the point. Hold the shot longer than comfortable.',
    focus: [
      'uncanny mundane - ordinary objects become alien',
      'dream logic - connect via mood not causation',
      'atmosphere - the air is heavy, electricity hums',
      'mystery - never fully explain',
    ],
    hates: [
      'over-explanation - spelling out the symbolism',
      'neat resolutions - everything wrapped up',
      'surface-level imagery - obvious metaphors',
      'rushing through tension',
    ],
    slopSignals: [
      'metaphors are explained immediately',
      'no atmospheric details (sound, light, texture)',
      'everything resolves cleanly',
      'no lingering unease or questions',
    ],
    voice: 'Ethereal, hypnotic, deeply unsettling',
  },
} as const

type PersonaId = keyof typeof PERSONAS

/**
 * The Mazur Score combines all three dimensions.
 * Great storytelling needs ALL THREE to score high.
 * AI slop consistently fails all three.
 */
interface MazurScore {
  depth: number // GRRM dimension (0-1)
  structure: number // Gilligan dimension (0-1)
  feeling: number // Lynch dimension (0-1)
  overall: number // Combined score
  slopScore: number // Inverse - how much AI slop detected (0 = no slop, 1 = pure slop)
}
