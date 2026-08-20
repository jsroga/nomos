/**
 * CENTRAL MODEL CONFIGURATION
 *
 * ONE FILE TO RULE THEM ALL.
 * Every model used anywhere in the system is configured here.
 */

import { createOpenAI } from '@ai-sdk/openai'

// =============================================================================
// OPENROUTER GATEWAY — one key to rule them all
// =============================================================================
//
// Everything routes through the OpenRouter gateway so a single
// OPENROUTER_API_KEY serves every provider (no per-provider keys).
//
// Text generation policy (2026-07-28):
 // - Preferred default: latest Kimi (`moonshotai/kimi-k3`)
 // - Short / high-impact bursts: GPT-5.6 Sol (`openai/gpt-5.6-sol`)
 // - Anthropic Claude is NEVER used for text generation (remapped to Kimi)
//
// NOTE: if Mastra's model router needs a gateway double-prefix for a special
// router id, change ONLY the constants below — every resolver funnels through
// `toOpenRouterModel`.

/** Preferred default for long-form / general text generation (Kimi latest). */
export const TEXT_GEN_PRIMARY_MODEL = 'moonshotai/kimi-k3'
/** Short but impactful text (hooks, critics, blurbs). */
export const TEXT_GEN_SHORT_IMPACT_MODEL = 'openai/gpt-5.6-sol'
/** Fastest responses (autocomplete, glue, low-effort). */
export const TEXT_GEN_FAST_MODEL = 'openai/gpt-5.6-luna'
/** CorkBoard storyboard voice-over via OpenRouter `/audio/speech`. */
export const TEXT_TO_SPEECH_MODEL = 'x-ai/grok-voice-tts-1.0'

/**
 * OpenRouter MODEL ID for the app default — what OpenRouter's API expects, and
 * what direct OpenAI-compatible clients pass as `model`.
 */
export const OPENROUTER_AUTO_MODEL = TEXT_GEN_PRIMARY_MODEL
/** Mastra model-router gateway string for the default text model. */
export const OPENROUTER_AUTO_GATEWAY = `openrouter/${TEXT_GEN_PRIMARY_MODEL}`
/** OpenAI-compatible endpoint for LangChain / AI-SDK clients. */
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const OPENROUTER_GATEWAY_PREFIX = 'openrouter/'
const OPENROUTER_PROVIDER = 'openrouter'
const ANTHROPIC_PROVIDER = 'anthropic'
const PROVIDER_COLON = ':'
const PROVIDER_SLASH = '/'

function stripOpenRouterGatewayPrefix(modelId: string): string {
  const segments = modelId.split(PROVIDER_SLASH)
  if (segments[0] === OPENROUTER_PROVIDER && segments.length >= 3) {
    return segments.slice(1).join(PROVIDER_SLASH)
  }
  return modelId
}

/** True when the id targets Anthropic Claude (any form). */
export function isAnthropicTextModelId(id: string): boolean {
  const normalized = stripOpenRouterGatewayPrefix(id.trim().replace(PROVIDER_COLON, PROVIDER_SLASH))
  return (
    normalized === ANTHROPIC_PROVIDER ||
    normalized.startsWith(`${ANTHROPIC_PROVIDER}${PROVIDER_SLASH}`)
  )
}

/**
 * Enforce the no-Anthropic text-gen policy. Remaps Claude ids to Kimi latest.
 */
export function enforceTextGenModelPolicy(id: string): string {
  if (!isAnthropicTextModelId(id)) return id
  console.warn(
    `[models] Anthropic text models are disabled; remapping "${id}" → "${TEXT_GEN_PRIMARY_MODEL}"`
  )
  return TEXT_GEN_PRIMARY_MODEL
}

/**
 * Normalize to an OpenRouter MODEL ID (`provider/model`): `provider:model` →
 * `provider/model`; empty → Kimi latest. Anthropic ids remap to Kimi.
 */
export function toOpenRouterModelId(id?: string): string {
  const trimmed = id?.trim()
  if (!trimmed) return OPENROUTER_AUTO_MODEL
  const normalized = stripOpenRouterGatewayPrefix(trimmed.replace(PROVIDER_COLON, PROVIDER_SLASH))
  return enforceTextGenModelPolicy(normalized)
}


/**
 * Mastra model-router gateway string: `openrouter/<openrouter-model-id>`.
 * Accepts `provider:model`, an OpenRouter model id, or an already-gatewayed
 * 3-segment `openrouter/x/y` id. Anthropic ids remap to Kimi before gatewaying.
 */
export function toOpenRouterModel(id?: string): string {
  const modelId = toOpenRouterModelId(id)
  const segments = modelId.split(PROVIDER_SLASH)
  // Already a Mastra gateway string (openrouter/<provider>/<model>) — leave it.
  if (segments[0] === OPENROUTER_PROVIDER && segments.length >= 3) return modelId
  return `${OPENROUTER_GATEWAY_PREFIX}${modelId}`
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
    primary: process.env.GENERATION_MODEL || TEXT_GEN_PRIMARY_MODEL,
    fast: process.env.GENERATION_MODEL_FAST || TEXT_GEN_FAST_MODEL,
    creative: process.env.GENERATION_MODEL_CREATIVE || TEXT_GEN_PRIMARY_MODEL,
  },

  // === JUDGING MODELS (for evaluation - independent layer) ===
  judging: {
    primary: process.env.JUDGING_MODEL || TEXT_GEN_SHORT_IMPACT_MODEL,
    fallback: process.env.JUDGING_MODEL_FALLBACK || TEXT_GEN_PRIMARY_MODEL,
    // Low temperature for consistent judging
    temperature: 0.1,
  },

  // === PLANNING MODELS (for reasoning/planning) ===
  planning: {
    primary: process.env.PLANNING_MODEL || TEXT_GEN_PRIMARY_MODEL,
    reasoning: process.env.PLANNING_MODEL_REASONING || TEXT_GEN_PRIMARY_MODEL,
  },

  // === EMBEDDING MODELS (OpenRouter `/embeddings` — same OPENROUTER_API_KEY) ===
  embedding: {
    primary: process.env.EMBEDDING_MODEL || 'openai/text-embedding-3-small',
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

function openAiCompatibleModel(
  modelId: string,
  apiKey: string | undefined,
  baseURL: string | undefined,
  chatCompletions: boolean,
) {
  const openai = createOpenAI({ apiKey, baseURL })
  return chatCompletions ? openai.chat(modelId) : openai(modelId)
}

/**
 * Create model for pure AI SDK usage (generateObject, generateText)
 * Does NOT set specificationVersion - uses native AI SDK behavior
 */
export function createPureModel(modelName: string, chatCompletions = false) {
  const enforced = enforceTextGenModelPolicy(modelName.replace(PROVIDER_COLON, PROVIDER_SLASH))
  const colonForm = enforced.includes(PROVIDER_SLASH)
    ? enforced.replace(PROVIDER_SLASH, PROVIDER_COLON)
    : enforced

  // OpenAI (Luna / Sol / …) — prefer OpenRouter; optional OPENAI_API_KEY direct fallback
  if (colonForm.startsWith('openai:')) {
    const useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY)
    const modelId = useOpenRouter
      ? colonForm.replace(PROVIDER_COLON, PROVIDER_SLASH)
      : colonForm.replace('openai:', '')
    return openAiCompatibleModel(
      modelId,
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
      useOpenRouter ? OPENROUTER_BASE_URL : undefined,
      chatCompletions,
    )
  }

  // Google / Moonshot — OpenRouter only (no direct vendor key required)
  if (colonForm.startsWith('google:') || colonForm.startsWith('moonshotai:')) {
    return openAiCompatibleModel(
      colonForm.replace(PROVIDER_COLON, PROVIDER_SLASH),
      process.env.OPENROUTER_API_KEY,
      OPENROUTER_BASE_URL,
      chatCompletions,
    )
  }

  // Default: Kimi latest via OpenRouter
  return openAiCompatibleModel(
    TEXT_GEN_PRIMARY_MODEL,
    process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
    process.env.OPENROUTER_API_KEY ? OPENROUTER_BASE_URL : undefined,
    chatCompletions,
  )
}

/** Chat Completions (not Responses) — required for OpenRouter LLM-as-judge. */
export function createPureChatModel(modelName: string) {
  return createPureModel(modelName, true)
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
