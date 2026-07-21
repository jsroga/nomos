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
// OPENROUTER GATEWAY — one key to rule them all
// =============================================================================
//
// Everything routes through the OpenRouter gateway so a single
// OPENROUTER_API_KEY serves every provider (no per-provider keys). The default
// model is OpenRouter's auto router (`openrouter/auto-beta`); operators can pin
// a specific model per env override (e.g. STORYTELLER_AUTHOR_MODEL=
// openrouter/moonshotai/kimi-k2), which is routed through the same gateway.
//
// NOTE: this is the single knob. If Mastra's model router needs the gateway
// double-prefixed (`openrouter/openrouter/auto-beta`), change ONLY this
// constant — every resolver funnels through `toOpenRouterModel`.

export const OPENROUTER_AUTO_MODEL = 'openrouter/auto-beta'
/** OpenAI-compatible endpoint for LangChain / AI-SDK clients that can't take a Mastra gateway string. */
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const OPENROUTER_GATEWAY_PREFIX = 'openrouter/'
const PROVIDER_COLON = ':'
const PROVIDER_SLASH = '/'

/**
 * Route any model id through the OpenRouter gateway. Accepts `provider:model`,
 * `provider/model`, or an already-gatewayed `openrouter/…` id; empty/undefined
 * → `openrouter/auto-beta`. Idempotent.
 */
export function toOpenRouterModel(id?: string): string {
  const trimmed = id?.trim()
  if (!trimmed) return OPENROUTER_AUTO_MODEL
  if (trimmed.startsWith(OPENROUTER_GATEWAY_PREFIX)) return trimmed
  return `${OPENROUTER_GATEWAY_PREFIX}${trimmed.replace(PROVIDER_COLON, PROVIDER_SLASH)}`
}

/** Config for LangChain `ChatOpenAI` / AI-SDK `createOpenAI` pointed at OpenRouter. */
export function openRouterClientConfig(): { apiKey: string | undefined; baseURL: string } {
  return { apiKey: process.env.OPENROUTER_API_KEY, baseURL: OPENROUTER_BASE_URL }
}

// =============================================================================
// MODEL REGISTRY - All models defined in one place
// =============================================================================

export const MODELS = {
  // === GENERATION MODELS (for creating content) ===
  generation: {
    primary: process.env.GENERATION_MODEL || OPENROUTER_AUTO_MODEL,
    fast: process.env.GENERATION_MODEL_FAST || OPENROUTER_AUTO_MODEL,
    creative: process.env.GENERATION_MODEL_CREATIVE || OPENROUTER_AUTO_MODEL,
  },

  // === JUDGING MODELS (for evaluation - independent layer) ===
  judging: {
    primary: process.env.JUDGING_MODEL || OPENROUTER_AUTO_MODEL,
    fallback: process.env.JUDGING_MODEL_FALLBACK || OPENROUTER_AUTO_MODEL,
    // Low temperature for consistent judging
    temperature: 0.1,
  },

  // === PLANNING MODELS (for reasoning/planning) ===
  planning: {
    primary: process.env.PLANNING_MODEL || OPENROUTER_AUTO_MODEL,
    reasoning: process.env.PLANNING_MODEL_REASONING || OPENROUTER_AUTO_MODEL,
  },

  // === EMBEDDING MODELS (OpenRouter has no unified embeddings gateway → own key) ===
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
// =============================================================================
// THE MAZUR FRAMEWORK - Why These Four Masters?
// =============================================================================
//
// Four creators form a COMPLETE storytelling diamond:
//
//                    DEPTH (GRRM)
//                        ◇
//                       / \
//                      /   \
//     ORIGINALITY ◁──/─────\──▷ STRUCTURE
//     (Le Guin)     /       \    (Gilligan)
//                  \         /
//                   \       /
//                    \     /
//                     \   /
//                      \ /
//                       ◇
//                   FEELING (Lynch)
//
// Each catches what the others miss:
// - GRRM: "Is this REAL?" - catches shallow characters, convenient plots
// - GILLIGAN: "Does this WORK?" - catches illogical sequences, weak visuals
// - LYNCH: "Does this HAUNT?" - catches lack of atmosphere, over-explanation
// - LE GUIN: "Is this NECESSARY?" - catches AI slop, clichés, generic prose, derivative ideas
//
// AI slop fails ALL FOUR:
// - Slop has no depth (generic characters, no consequences)
// - Slop has no structure (things happen "because plot")
// - Slop has no feeling (explains everything, no mystery)
// - Slop has no originality (borrowed ideas, hedging language, interchangeable characters)
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
      'modern slang or anachronisms',
      'villains who are evil just to be evil',
      'safe choices that preserve the status quo',
    ],
    slopSignals: [
      'character does something "out of character" for plot',
      'consequences disappear when inconvenient',
      'world feels generic, no lived-in texture',
      'everyone agrees too easily',
      'dialogue that sounds like a therapy session',
      'lack of sensory details (smell/taste/grit)',
    ],
    voice: 'Melancholic, cynical, richly detailed, ruthless',
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
      'passive protagonists who just react',
      'fuzzy logic or dream sequences to escape corners',
      'unearned emotional moments',
    ],
    slopSignals: [
      'character explains their feelings instead of showing',
      'solution appears from nowhere',
      'timeline/continuity errors',
      'actions without consequences',
      'scenes that start too early or end too late',
      'exposition dumps disguised as arguments',
    ],
    voice: 'Tense, observant, cinematic, precise',
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

  'ursula-le-guin': {
    name: 'Ursula K. Le Guin',
    alias: 'The Truthteller',
    dimension: 'ORIGINALITY',
    question: 'Is this NECESSARY?',
    magic:
      'Every sentence earns its place. No decoration, no showing off, no borrowed ideas. The story could only exist in THIS world with THESE characters. There is no other version.',
    focus: [
      'specificity - details unique to this world, not borrowed from tropes',
      'necessity - every element must serve the story or be cut',
      'authentic voice - prose that sounds like a person, not an algorithm',
      'original framing - familiar themes approached from unexpected angles',
      'creative risk - at least one bold choice that could only exist here',
      'invention - a spark: a detail, turn, or framing that feels newly imagined, not borrowed',
    ],
    hates: [
      'borrowed ideas - plot points lifted from popular media without transformation',
      'decorative prose - beautiful language that says nothing',
      'interchangeable characters - names you could swap without anyone noticing',
      'AI-speak - hedging phrases, fake profundity, synonym stuffing',
      'derivative worlds - fantasy/sci-fi settings that are just Tolkien/Star Wars reskins',
      'filler - scenes that exist to pad length rather than advance story',
    ],
    slopSignals: [
      'phrases like "it\'s worth noting", "tapestry of", "delve into", "embark on"',
      'emotions named rather than shown ("she felt sad", "tension was palpable")',
      'purple prose - orbs for eyes, crimson liquid for blood',
      'characters who all sound the same regardless of background',
      'world-building that reads like a wiki article rather than lived experience',
      'descriptions that could apply to any story ("the ancient city", "the mysterious stranger")',
    ],
    voice: 'Precise, understated, deceptively simple, cuts to the bone',
  },
} as const
