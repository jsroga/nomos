import { createOpenAI } from '@ai-sdk/openai'
import {
  DEFAULT_CHAT_MODEL,
  getChatModelOption,
  isKnownChatModel,
} from '@/domains/storyteller/config/constants/chat-model-catalog'
import {
  OPENROUTER_AUTO_GATEWAY,
  OPENROUTER_BASE_URL,
  TEXT_GEN_FAST_MODEL,
  TEXT_GEN_PRIMARY_MODEL,
  TEXT_GEN_SHORT_IMPACT_MODEL,
  enforceTextGenModelPolicy,
  toOpenRouterModel,
  toOpenRouterModelId,
} from '@/shared/agent-kernel/models'
import { getConfiguredModel } from '@/shared/agent-kernel/model-settings'

/**
 * Effort levels for dynamic model selection
 * See: https://mastra.ai/models (Mix and match models, Dynamic model selection)
 */
export type ModelEffort = 'low' | 'medium' | 'high'

/**
 * Model configurations by effort level
 * - low: Fastest (GPT-5.6 Luna)
 * - medium: Short / high-impact (GPT-5.6 Sol)
 * - high: Primary long-form (Kimi latest)
 */
export const MODEL_BY_EFFORT: Record<ModelEffort, string> = {
  low: TEXT_GEN_FAST_MODEL.replace('/', ':'),
  medium: TEXT_GEN_SHORT_IMPACT_MODEL.replace('/', ':'),
  high: TEXT_GEN_PRIMARY_MODEL.replace('/', ':'),
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
 * @param modelName - Model identifier (e.g., 'openai:gpt-5.6-luna') or effort level ('low', 'medium', 'high')
 */
export function getAgentModel(modelName: string = TEXT_GEN_PRIMARY_MODEL) {
  // Support effort-based selection
  if (modelName === 'low' || modelName === 'medium' || modelName === 'high') {
    modelName = getModelByEffort(modelName)
  }
  const enforced = enforceTextGenModelPolicy(modelName.replace(':', '/'))
  const colonForm = enforced.includes('/') ? enforced.replace('/', ':') : enforced
  // AI SDK v4 requires specificationVersion 'v1'
  const specVersion = 'v1'

  // OpenAI — prefer OpenRouter; optional OPENAI_API_KEY direct fallback
  if (colonForm.startsWith('openai:')) {
    const useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY)
    const modelId = useOpenRouter
      ? colonForm.replace(':', '/')
      : colonForm.replace('openai:', '')
    const openai = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: useOpenRouter ? OPENROUTER_BASE_URL : undefined,
    })
    const model = openai(modelId)
    Object.assign(model, { specificationVersion: specVersion })
    return model
  }

  // Google / Moonshot — OpenRouter only
  if (colonForm.startsWith('google:') || colonForm.startsWith('moonshotai:')) {
    const openai = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: OPENROUTER_BASE_URL,
    })
    const model = openai(colonForm.replace(':', '/'))
    Object.assign(model, { specificationVersion: specVersion })
    return model
  }

  // Default to a raw string or the model name if it doesn't match a provider
  // This allows Mastra's internal provider lookups to work if configured
  return colonForm
}

/**
 * Global default model setting
 * Use this to switch the entire Council of Agents at once.
 */
export const GLOBAL_AGENT_MODEL =
  process.env.NEXT_PUBLIC_DEFAULT_AGENT_MODEL || OPENROUTER_AUTO_GATEWAY

/**
 * Model fallback configuration for resilience
 * See: https://mastra.ai/models#model-fallbacks
 *
 * If primary model fails, automatically falls back to next in chain
 */
export const MODEL_FALLBACKS = [{ model: OPENROUTER_AUTO_GATEWAY, maxRetries: 3 }]

/**
 * Get model string for Mastra's unified API format
 * Converts 'openai:gpt-5.6-luna' to 'openai/gpt-5.6-luna'
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
  return isMastraGatewayModelId(routed) ? routed : OPENROUTER_AUTO_GATEWAY
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
  // Catalog entries may map to a different OpenRouter id (e.g. GLM: internal
  // `zai-coding-plan:glm-5.2` → `z-ai/glm-5.2`); otherwise route the id as-is.
  return toOpenRouterGatewayId(option?.openRouterId ?? modelName)
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
// 2026 pricing: GPT-5.6 Luna (fast), Gemini Flash, GPT-5.2, Claude Sonnet —
// prefer OpenRouter ids; fast glue roles use TEXT_GEN_FAST_MODEL (Luna).
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
  model: OPENROUTER_AUTO_GATEWAY,
  /** Max tool-call iterations per generate() for multi-step agents. */
  maxSteps: 10,
  /** Fallback sampling when no per-agent matrix entry exists. */
  temperature: 0.7,
  topP: 0.9,
} as const

export const AGENT_MODEL_MATRIX: Record<string, AgentModelConfig> = {
  // === TIER 1: CHEAP + FAST (analysis, scoring, structured output) ===
  psychologist: {
    model: 'moonshotai:kimi-k3',
    temperature: 0.55,
    topP: 0.9,
    maxOutputTokens: 4000,
    rationale: 'High EQ required. Temp 0.55 balances analytical rigor with narrative voice — too cold produces formulaic psychology. Non-core role: Kimi K3 replaces the prohibited Claude Sonnet 5.',
  },
  consequence: {
    model: 'openai:gpt-5.2',
    temperature: 0.45,
    topP: 0.9,
    maxOutputTokens: 4000,
    rationale: 'Causality tracking needs logic but also narrative awareness. Temp 0.45 avoids clinical tone while staying rigorous.',
  },
  'consequence-scoring': {
    model: DEFAULT_CHAT_MODEL,
    temperature: 0.3,
    topP: 0.9,
    maxOutputTokens: 2000,
    rationale:
      'Follows the Writers Room user picker (same catalog as author).',
  },
  'quality-gate': {
    model: DEFAULT_CHAT_MODEL,
    temperature: 0.1,
    topP: 0.9,
    maxOutputTokens: 1000,
    rationale: 'Follows the Writers Room user picker (same catalog as author).',
  },
  'creative-director': {
    model: DEFAULT_CHAT_MODEL,
    temperature: 0.5,
    topP: 0.9,
    maxOutputTokens: 2000,
    rationale: 'Follows the Writers Room user picker (same catalog as author).',
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
    model: 'openai:gpt-5.2',
    temperature: 0.72,
    topP: 0.92,
    maxOutputTokens: 6000,
    rationale:
      'Standard scene writing. Temp 0.72 narrows quality band — still creative but less prone to purple prose. Fast non-core role uses GPT-5.2 instead of Claude Sonnet 5.',
  },
  autocomplete: {
    model: 'openai:gpt-5.6-luna',
    temperature: 0.4,
    topP: 0.9,
    maxOutputTokens: 200,
    rationale: 'Ghost-text completions must be FAST (<500ms). Luna via OpenRouter. Short output.',
  },

  // === TIER 3: FULL CREATIVE POWER (important scenes, orchestration) ===
  storyteller: {
    model: 'moonshotai:kimi-k3',
    temperature: 0.75,
    topP: 0.92,
    maxOutputTokens: 8000,
    rationale:
      'Orchestrator and main writer — core role must use Kimi or GLM per user policy (Claude Sonnet 5 prohibited). Kimi K3 balances originality with consistency.',
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
    model: 'moonshotai:kimi-k3',
    temperature: 0.78,
    topP: 0.93,
    maxOutputTokens: 8000,
    rationale:
      'Climactic scenes get slightly higher temp for peak creativity, but still controlled. Core creative role uses Kimi K3 instead of Claude Sonnet 5.',
  },
  'gardener-refinement': {
    model: 'openai:gpt-5.2',
    temperature: 0.65,
    topP: 0.9,
    maxOutputTokens: 6000,
    rationale: 'Refinement passes need precision over creativity. Lower temp for targeted, controlled rewrites. Non-core role uses GPT-5.2 instead of Claude Sonnet 5.',
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
    model: 'moonshotai:kimi-k3',
    temperature: 0.75,
    topP: 0.92,
    maxOutputTokens: 8000,
    rationale:
      'Single GRRM author drafts AND revises — Kimi K3 by default; pin via STORYTELLER_AUTHOR_MODEL. Not driven by the Writers Room chat picker (that only overrides the chat adapter). Planner/premise stay Opus-class. Code models are prohibited in storyteller.',
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
    model: DEFAULT_CHAT_MODEL,
    temperature: 1.0,
    topP: 0.98,
    maxOutputTokens: 1500,
    rationale:
      'Blank-context wildcard ideas. Uses the muse slot (STORYTELLER_MUSE_MODEL / matrix), not the Writers Room chat picker. Entropy is code-side (D4).',
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
    model: DEFAULT_CHAT_MODEL,
    temperature: 0.7,
    topP: 0.9,
    maxOutputTokens: 2000,
    rationale:
      'Writers Room chat adapter. Per-request picker (Kimi / GLM / Opus) wins; else STORYTELLER_CHAT_MODEL; else this matrix default. Orchestration roles (author/planner/critic/muse/premise) use their own slots — not the chat picker.',
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
  // Single-key OpenRouter: per-request picker → admin panel setting → operator
  // env override (STORYTELLER_<ROLE>_MODEL) → auto router. All routed through the
  // same gateway. The per-role matrix still supplies temperature/topP/rationale.
  const explicit = validatedOverride ?? getConfiguredModel(role) ?? roleEnvOverride(role)
  return explicit ? resolveStorytellerModel(explicit) : OPENROUTER_AUTO_GATEWAY
}

/**
 * OpenRouter model id for author-slot paths that talk to OpenAI-compatible
 * clients (string `model` only). Order: explicit override → admin author →
 * STORYTELLER_AUTHOR_MODEL → {@link DEFAULT_CHAT_MODEL}.
 * Not the Writers Room chat picker.
 */
export function resolveUserPickerOpenRouterModelId(overrideId?: string): string {
  const validatedOverride = overrideId && isKnownChatModel(overrideId) ? overrideId : undefined
  const catalogOrOpenRouterId =
    validatedOverride ??
    getConfiguredModel('author') ??
    process.env.STORYTELLER_AUTHOR_MODEL ??
    DEFAULT_CHAT_MODEL
  const option = getChatModelOption(catalogOrOpenRouterId)
  return toOpenRouterModelId(option?.openRouterId ?? catalogOrOpenRouterId)
}

