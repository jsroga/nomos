import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { getChatModelOption, isKnownChatModel } from '@/domains/storyteller/config/constants/chat-model-catalog'
import { OPENROUTER_AUTO_MODEL, toOpenRouterModel } from '@/shared/agent-kernel/models'

/**
 * Effort levels for dynamic model selection
 * See: https://mastra.ai/models (Mix and match models, Dynamic model selection)
 */
export type ModelEffort = 'low' | 'medium' | 'high'

/**
 * Model configurations by effort level
 * - low: Fast, cost-effective (gpt-4o-mini)
 * - medium: Balanced (gpt-4o) - DEFAULT for testing
 * - high: Maximum capability (claude-4.5-sonnet)
 */
export const MODEL_BY_EFFORT: Record<ModelEffort, string> = {
  low: 'openai:gpt-4o-mini',
  medium: 'openai:gpt-4o-mini',
  high: 'anthropic:claude-sonnet-5',
}

/**
 * Get model string based on effort level
 * Enables dynamic model selection based on task complexity
 */
export function getModelByEffort(effort: ModelEffort = 'medium'): string {
  return MODEL_BY_EFFORT[effort]
}

/**
 * Centrally manages agent models and ensures Mastra compatibility.
 * "One var to rule them all" approach.
 *
 * NOTE: Using specificationVersion 'v1' for AI SDK v4 compatibility.
 * When upgrading to AI SDK v5, change to 'v2'.
 *
 * @param modelName - Model identifier (e.g., 'openai:gpt-4o') or effort level ('low', 'medium', 'high')
 */
export function getAgentModel(modelName: string = 'openai:gpt-4o') {
  // Support effort-based selection
  if (modelName === 'low' || modelName === 'medium' || modelName === 'high') {
    modelName = getModelByEffort(modelName)
  }
  // AI SDK v4 requires specificationVersion 'v1'
  const specVersion = 'v1'

  // 1. Handle OpenAI
  if (modelName.startsWith('openai:')) {
    const modelId = modelName.replace('openai:', '')
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    const model = openai(modelId)
      Object.assign(model, { specificationVersion: specVersion })
    return model
  }

  // 2. Handle Anthropic
  if (modelName.startsWith('anthropic:')) {
    const modelId = modelName.replace('anthropic:', '')
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
    const model = anthropic(modelId)
      Object.assign(model, { specificationVersion: specVersion })
    return model
  }

  // 3. Handle Google (Gemini)
  if (modelName.startsWith('google:')) {
    const modelId = modelName.replace('google:', '')
    const model = google(modelId)
      Object.assign(model, { specificationVersion: specVersion })
    return model
  }

  // Default to a raw string or the model name if it doesn't match a provider
  // This allows Mastra's internal provider lookups to work if configured
  return modelName
}

/**
 * Global default model setting
 * Use this to switch the entire Council of Agents at once.
 */
export const GLOBAL_AGENT_MODEL =
  process.env.NEXT_PUBLIC_DEFAULT_AGENT_MODEL || OPENROUTER_AUTO_MODEL

/**
 * Model fallback configuration for resilience
 * See: https://mastra.ai/models#model-fallbacks
 *
 * If primary model fails, automatically falls back to next in chain
 */
export const MODEL_FALLBACKS = [{ model: OPENROUTER_AUTO_MODEL, maxRetries: 3 }]

/**
 * Get model string for Mastra's unified API format
 * Converts 'openai:gpt-4o' to 'openai/gpt-4o'
 */
export function toMastraModelString(modelName: string): string {
  return modelName.replace(':', '/')
}

export type MastraGatewayModelId = `${string}/${string}`

export interface MastraEndpointModelConfig {
  url: string
  id: MastraGatewayModelId
  apiKey: string
}

export type StorytellerMastraModel = MastraGatewayModelId | MastraEndpointModelConfig

function isMastraGatewayModelId(value: string): value is MastraGatewayModelId {
  const slash = value.indexOf('/')
  return slash > 0 && slash < value.length - 1
}

function mastraGatewayModelIdFromCatalog(catalogId: string): MastraGatewayModelId {
  const colon = catalogId.indexOf(':')
  if (colon <= 0 || colon >= catalogId.length - 1) {
    throw new Error(`Invalid catalog model id: ${catalogId}`)
  }
  const candidate = `${catalogId.slice(0, colon)}/${catalogId.slice(colon + 1)}`
  if (!isMastraGatewayModelId(candidate)) {
    throw new Error(`Cannot build Mastra model id from: ${catalogId}`)
  }
  return candidate
}

/**
 * Resolve an internal `provider:model` id (from `ChatModelCatalog`) into
 * something Mastra's `Agent({ model })` accepts — either a `provider/model`
 * string resolved by the built-in models.dev gateway, or an explicit
 * `{ url, id, apiKey }` object for models that need a custom endpoint.
 *
 * The object form is used for catalog entries that set `endpointUrl` (e.g.
 * Z.AI Coding Plan's `glm-5.2`, which is not yet in Mastra's bundled
 * provider-registry.json). The apiKey is read from the catalog entry's env var.
 */
function toOpenRouterGatewayId(modelName: string): MastraGatewayModelId {
  const routed = toOpenRouterModel(modelName)
  return isMastraGatewayModelId(routed) ? routed : OPENROUTER_AUTO_MODEL
}

export function resolveStorytellerModel(modelName: string): StorytellerMastraModel {
  const option = getChatModelOption(modelName)
  // Custom-endpoint catalog entries (e.g. GLM via Z.AI Coding Plan) keep their
  // own url + key — the documented exception to the single-OpenRouter-key rule.
  if (option?.endpointUrl) {
    const apiKey = process.env[option.envVar]
    if (!apiKey) {
      throw new Error(
        `Model ${modelName} requires ${option.envVar} to be set (provider: ${option.provider}).`
      )
    }
    return {
      url: option.endpointUrl,
      id: mastraGatewayModelIdFromCatalog(modelName),
      apiKey,
    }
  }
  return toOpenRouterGatewayId(modelName)
}

/**
 * Determine effort level based on task context
 * Used for dynamic model selection
 */
export function inferEffortFromContext(context: {
  taskType?: 'simple' | 'complex' | 'creative'
  hasToolCalls?: boolean
  requiresReasoning?: boolean
}): ModelEffort {
  // Creative or complex reasoning tasks get high effort
  if (context.taskType === 'creative' || context.requiresReasoning) {
    return 'high'
  }
  // Complex tasks with tools get medium effort
  if (context.taskType === 'complex' || context.hasToolCalls) {
    return 'medium'
  }
  // Simple tasks get low effort (faster, cheaper)
  return 'low'
}

// =============================================================================
// AGENT-MODEL ASSIGNMENT MATRIX
// Maps each agent role to its optimal model, temperature, and token limits.
// 2026 pricing: gpt-4o-mini $0.15/$0.60, Gemini Flash $0.30/$2.50,
// gpt-4o $2.50/$10.00, GPT-5.2 $1.75/$14.00, Claude Sonnet 4.5 $3.00/$15.00
// =============================================================================

export interface AgentModelConfig {
  model: string
  temperature: number
  topP: number
  maxOutputTokens: number
  rationale: string
}

/**
 * Shared runtime defaults for agents, replacing scattered magic literals.
 * Sampling defaults are only used when an agent has no entry in
 * {@link AGENT_MODEL_MATRIX}.
 */
export const AGENT_RUNTIME_DEFAULTS = {
  /** Default model when an agent is created without an explicit one. */
  model: OPENROUTER_AUTO_MODEL,
  /** Max tool-call iterations per generate() for multi-step agents. */
  maxSteps: 10,
  /** Fallback sampling when no per-agent matrix entry exists. */
  temperature: 0.7,
  topP: 0.9,
} as const

export const AGENT_MODEL_MATRIX: Record<string, AgentModelConfig> = {
  // === TIER 1: CHEAP + FAST (analysis, scoring, structured output) ===
  psychologist: {
    model: 'anthropic:claude-sonnet-5',
    temperature: 0.55,
    topP: 0.9,
    maxOutputTokens: 4000,
    rationale: 'High EQ required. Temp 0.55 balances analytical rigor with narrative voice — too cold produces formulaic psychology.',
  },
  consequence: {
    model: 'openai:gpt-5.2',
    temperature: 0.45,
    topP: 0.9,
    maxOutputTokens: 4000,
    rationale: 'Causality tracking needs logic but also narrative awareness. Temp 0.45 avoids clinical tone while staying rigorous.',
  },
  'consequence-scoring': {
    model: 'openai:gpt-4o-mini',
    temperature: 0.3,
    topP: 0.9,
    maxOutputTokens: 2000,
    rationale:
      'Quality scoring needs nuanced judgment. Escalate from mini for scoreQuality() calls.',
  },
  'quality-gate': {
    model: 'openai:gpt-4o-mini',
    temperature: 0.1,
    topP: 0.9,
    maxOutputTokens: 1000,
    rationale: 'Mazur scoring is structured evaluation. Consistency > creativity.',
  },
  'creative-director': {
    model: 'openai:gpt-4o-mini',
    temperature: 0.5,
    topP: 0.9,
    maxOutputTokens: 2000,
    rationale: 'Advisory review = analysis + suggestions, not prose generation.',
  },

  // === TIER 2: FAST CREATIVE (drafts, critique, non-critical writing) ===
  'devils-advocate': {
    model: 'openai:gpt-5.2',
    temperature: 0.6,
    topP: 0.9,
    maxOutputTokens: 4000,
    rationale:
      'Critique requires finding logic gaps. GPT-5.2 is best for red-teaming and logic checks.',
  },
  'gardener-standard': {
    model: 'anthropic:claude-sonnet-5',
    temperature: 0.72,
    topP: 0.92,
    maxOutputTokens: 6000,
    rationale:
      'Standard scene writing. Temp 0.72 narrows quality band — still creative but less prone to purple prose.',
  },
  autocomplete: {
    model: 'openai:gpt-4o-mini',
    temperature: 0.4,
    topP: 0.9,
    maxOutputTokens: 200,
    rationale: 'Ghost-text completions must be FAST (<500ms). Mini is fastest. Short output.',
  },

  // === TIER 3: FULL CREATIVE POWER (important scenes, orchestration) ===
  storyteller: {
    model: 'anthropic:claude-sonnet-5',
    temperature: 0.75,
    topP: 0.92,
    maxOutputTokens: 8000,
    rationale:
      'Orchestrator and main writer. Temp 0.75 balances originality with consistency — high enough for surprise, low enough to avoid slop.',
  },
  'premise-architect': {
    model: 'openai:gpt-5.2',
    temperature: 0.8,
    topP: 0.95,
    maxOutputTokens: 8000,
    rationale: 'Premise generation needs maximum structural coherence and logic. GPT-5.2 excels here.',
  },

  // === TIER 4: PRESTIGE (climactic scenes, refinement passes) ===
  'gardener-climax': {
    model: 'anthropic:claude-sonnet-5',
    temperature: 0.78,
    topP: 0.93,
    maxOutputTokens: 8000,
    rationale:
      'Climactic scenes get slightly higher temp for peak creativity, but still controlled.',
  },
  'gardener-refinement': {
    model: 'anthropic:claude-sonnet-5',
    temperature: 0.65,
    topP: 0.9,
    maxOutputTokens: 6000,
    rationale: 'Refinement passes need precision over creativity. Lower temp for targeted, controlled rewrites.',
  },

  // === TIER 5: REASONING (complex planning, multi-step logic) ===
  'storyteller-complex': {
    model: 'openai:gpt-5.2',
    temperature: 0.7,
    topP: 0.9,
    maxOutputTokens: 8000,
    rationale:
      'Multi-step planning, complex tool chains. GPT-5.2 has best reasoning capabilities.',
  },

  // === GRRM PIPELINE ROLES (beat-draft-workflow: author / planner / critics) ===
  // NOTE: Claude Opus 4.7+ and Sonnet 5 reject temperature/topP at the API —
  // the sampling fields below are advisory for older models only; workflow
  // steps must not pass modelSettings when the resolved model is Claude 4.7+.
  author: {
    model: 'moonshotai:kimi-k2.7-code',
    temperature: 0.75,
    topP: 0.92,
    maxOutputTokens: 8000,
    rationale:
      'Single GRRM author drafts AND revises — the token-heavy role runs on Kimi 2.7 by user decision (2026-07-09); GLM 5.2 is the picker alternative. High-importance reasoning (planner/premise) stays Opus. Rollback: STORYTELLER_AUTHOR_MODEL=anthropic:claude-opus-4-8; validation: PLAN-V2 7.2 evals.',
  },
  planner: {
    model: 'anthropic:claude-opus-4-8',
    temperature: 0.6,
    topP: 0.9,
    maxOutputTokens: 4000,
    rationale:
      'Beat plans decide what the author dramatizes — high-importance reasoning runs Opus 4.8 by user decision (2026-07-09). Structured JSON output (goal/conflict/turn/hook), short, so the cost per run is bounded.',
  },
  critic: {
    model: 'anthropic:claude-haiku-4-5',
    temperature: 0.3,
    topP: 0.9,
    maxOutputTokens: 2000,
    rationale:
      'Narrow diagnose-only critics with quoted evidence. Cheap model is fine — critics are not the quality bottleneck (StoryForge finding).',
  },
  muse: {
    model: 'openai:gpt-4o-mini',
    temperature: 1.0,
    topP: 0.98,
    maxOutputTokens: 1500,
    rationale:
      'Blank-context wildcard ideas. The randomness comes from code-side entropy injection (D4), not model sampling — cheap and fast is the point.',
  },
  premise: {
    model: 'anthropic:claude-opus-4-8',
    temperature: 0.8,
    topP: 0.95,
    maxOutputTokens: 8000,
    rationale:
      'Premise / roadmap architecture — the highest-leverage structural decisions. Fable-class opt-in via STORYTELLER_PREMISE_MODEL=anthropic:claude-fable-5.',
  },
  chat: {
    model: 'anthropic:claude-sonnet-5',
    temperature: 0.7,
    topP: 0.9,
    maxOutputTokens: 4000,
    rationale:
      'Thin chat adapter — tool routing and conversation glue, not prose. The picker does NOT drive this slot (the picker drives the author, per D2).',
  },
}

/** Pipeline + product roles with env overrides (STORYTELLER_<ROLE>_MODEL). */
export type StorytellerModelRole = 'author' | 'planner' | 'critic' | 'muse' | 'premise' | 'chat'

/** Role → env-override variable name (also consumed by the routing readout). */
export const ROLE_ENV_VARS: Record<StorytellerModelRole, string> = {
  author: 'STORYTELLER_AUTHOR_MODEL',
  planner: 'STORYTELLER_PLANNER_MODEL',
  critic: 'STORYTELLER_CRITIC_MODEL',
  muse: 'STORYTELLER_MUSE_MODEL',
  premise: 'STORYTELLER_PREMISE_MODEL',
  chat: 'STORYTELLER_CHAT_MODEL',
}

const STORYTELLER_ROLES = new Set<string>(Object.keys(ROLE_ENV_VARS))

function isStorytellerRole(agentId: string): agentId is StorytellerModelRole {
  return STORYTELLER_ROLES.has(agentId)
}

// Read at call time (not module load) so dotenv-loaded scripts and per-env
// rollbacks work without import-order sensitivity.
function roleEnvOverride(agentId: string): string | undefined {
  if (!isStorytellerRole(agentId)) return undefined
  return process.env[ROLE_ENV_VARS[agentId]]
}

/**
 * Get the model config for a specific agent role.
 * Falls back to the global default if no specific config exists.
 */
export function getAgentModelConfig(agentId: string): AgentModelConfig {
  const base = AGENT_MODEL_MATRIX[agentId] || {
    model: GLOBAL_AGENT_MODEL,
    temperature: 0.7,
    topP: 0.9,
    maxOutputTokens: 4000,
    rationale: 'Default fallback',
  }
  const override = roleEnvOverride(agentId)
  return override ? { ...base, model: override } : base
}

/**
 * Resolve a role to the model config Mastra's `Agent({ model })` accepts —
 * a `provider/model` gateway string, or a `{ url, id, apiKey }` object for
 * endpoint models (GLM via Z.AI Coding Plan). THE single role-resolution
 * path (item 57): user override → env override → matrix default.
 *
 * `overrideId` is user-influenced (the picker choice via RequestContext) and
 * is only honored when it names a known catalog entry — a user pref can never
 * point us at an arbitrary provider. Env overrides are operator-controlled
 * and pass through unvalidated (they are the rollback lever).
 */
export function resolveRoleModel(
  role: StorytellerModelRole,
  overrideId?: string
): StorytellerMastraModel {
  const validatedOverride = overrideId && isKnownChatModel(overrideId) ? overrideId : undefined
  // Single-key OpenRouter: default to the auto router; a user picker choice or
  // operator env override (STORYTELLER_<ROLE>_MODEL) is routed through the same
  // gateway. The per-role matrix below still supplies temperature/topP/rationale.
  const explicit = validatedOverride ?? roleEnvOverride(role)
  return explicit ? resolveStorytellerModel(explicit) : OPENROUTER_AUTO_MODEL
}

