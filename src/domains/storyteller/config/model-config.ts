import { env } from '../../../shared/config/env'
import { clientEnv } from '../../../shared/config/env.client'
import {
  resolveConfiguredModelId,
  type ModelRoleSpec,
} from '../../../shared/ai/gateway/model-registry'
import { createOpenAI } from '@ai-sdk/openai'
import {
  DEFAULT_CHAT_MODEL,
  getChatModelOption,
  isKnownChatModel,
} from './chat-model-catalog'
import {
  AGENT_MODEL_MATRIX,
  type AgentModelConfig,
} from './constants/agent-model-matrix'
import {
  OPENROUTER_AUTO_GATEWAY,
  OPENROUTER_BASE_URL,
  TEXT_GEN_FAST_MODEL,
  TEXT_GEN_PRIMARY_MODEL,
  enforceTextGenModelPolicy,
  toOpenRouterModel,
  toOpenRouterModelId,
} from '../../../shared/agent-kernel/models'
import { getConfiguredModel } from '../../../shared/agent-kernel/model-settings'
import { currentGatewayContext } from '../../../shared/ai/gateway/call-context'
import { withOpenRouterOutputBudget } from '../../../shared/ai/gateway/output-budget'
import { isE2eBannedModelId, isE2eLlmPinned, remapModelIdIfE2ePinned } from '../../../shared/ai/gateway/e2e-llm-pin'
import { E2ePinnedChatModel } from '../../../shared/ai/gateway/constants/e2e-llm-pin'

export type { AgentModelConfig }
export { AGENT_MODEL_MATRIX }

/**
 * Effort levels for dynamic model selection
 * See: https://mastra.ai/models (Mix and match models, Dynamic model selection)
 */
export enum ModelEffortLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export enum ModelTaskType {
  Simple = 'simple',
  Complex = 'complex',
  Creative = 'creative',
}

export type ModelEffort = `${ModelEffortLevel}`

/**
 * Model configurations by effort level
 * - low: cheap tier (GLM) — short structured work
 * - medium / high: primary long-form and structure (Kimi)
 */
export const MODEL_BY_EFFORT: Record<ModelEffort, string> = {
  [ModelEffortLevel.Low]: TEXT_GEN_FAST_MODEL.replace('/', ':'),
  [ModelEffortLevel.Medium]: TEXT_GEN_PRIMARY_MODEL.replace('/', ':'),
  [ModelEffortLevel.High]: TEXT_GEN_PRIMARY_MODEL.replace('/', ':'),
}

/**
 * Get model string based on effort level
 * Enables dynamic model selection based on task complexity
 */
export function getModelByEffort(effort: ModelEffort = ModelEffortLevel.Medium): string {
  return MODEL_BY_EFFORT[effort]
}

/** Providers reachable only through OpenRouter (no direct-key fallback). */
export enum OpenRouterOnlyPrefix {
  Google = 'google:',
  Moonshot = 'moonshotai:',
  ZAi = 'z-ai:',
}

export enum OpenAiColonPrefix {
  OpenAi = 'openai:',
}

export enum SpecVersion {
  V1 = 'v1',
}

export enum AgentModelFallbackRationale {
  Default = 'Default fallback',
}

const OPENROUTER_ONLY_PREFIXES = [
  OpenRouterOnlyPrefix.Google,
  OpenRouterOnlyPrefix.Moonshot,
  OpenRouterOnlyPrefix.ZAi,
]

function isOpenRouterOnlyProvider(colonForm: string): boolean {
  return OPENROUTER_ONLY_PREFIXES.some(prefix => colonForm.startsWith(prefix))
}

function storytellerOpenRouterModel(
  modelId: string,
  apiKey: string | undefined,
  baseURL: string | undefined,
) {
  const openai = createOpenAI({ apiKey, baseURL })
  // wrapLanguageModel is specificationVersion v3; Mastra generate() rejects v1.
  return withOpenRouterOutputBudget(openai(modelId))
}

/**
 * Centrally manages agent models and ensures Mastra compatibility.
 *
 * @param modelName - Model identifier (e.g., 'moonshotai:kimi-k3') or effort level ('low', 'medium', 'high')
 */
export function getAgentModel(modelName: string = TEXT_GEN_PRIMARY_MODEL) {
  // Support effort-based selection
  if (
    modelName === ModelEffortLevel.Low ||
    modelName === ModelEffortLevel.Medium ||
    modelName === ModelEffortLevel.High
  ) {
    modelName = getModelByEffort(modelName)
  }
  if (isE2eLlmPinned()) {
    const remapped = remapModelIdIfE2ePinned(modelName)
    if (
      remapped === E2ePinnedChatModel.CatalogId ||
      remapped === E2ePinnedChatModel.GatewayId ||
      remapped === E2ePinnedChatModel.OpenRouterId
    ) {
      return E2ePinnedChatModel.GatewayId
    }
  }
  const enforced = enforceTextGenModelPolicy(modelName.replace(':', '/'))
  const colonForm = enforced.includes('/') ? enforced.replace('/', ':') : enforced

  // OpenAI — prefer OpenRouter; optional OPENAI_API_KEY direct fallback
  if (colonForm.startsWith(OpenAiColonPrefix.OpenAi)) {
    const useOpenRouter = Boolean(env.OPENROUTER_API_KEY)
    const modelId = useOpenRouter
      ? colonForm.replace(':', '/')
      : colonForm.replace(OpenAiColonPrefix.OpenAi, '')
    return storytellerOpenRouterModel(
      modelId,
      env.OPENROUTER_API_KEY || env.OPENAI_API_KEY,
      useOpenRouter ? OPENROUTER_BASE_URL : undefined,
    )
  }

  // Google / Moonshot / Z.AI — OpenRouter only
  if (isOpenRouterOnlyProvider(colonForm)) {
    return storytellerOpenRouterModel(
      colonForm.replace(':', '/'),
      env.OPENROUTER_API_KEY,
      OPENROUTER_BASE_URL,
    )
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
  clientEnv.defaultAgentModel || OPENROUTER_AUTO_GATEWAY

/**
 * Model fallback configuration for resilience
 * See: https://mastra.ai/models#model-fallbacks
 *
 * If primary model fails, automatically falls back to next in chain
 */
export const MODEL_FALLBACKS = [{ model: OPENROUTER_AUTO_GATEWAY, maxRetries: 3 }]

/**
 * Get model string for Mastra's unified API format
 * Converts 'moonshotai:kimi-k3' to 'moonshotai/kimi-k3'
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
  taskType?: `${ModelTaskType}`
  hasToolCalls?: boolean
  requiresReasoning?: boolean
}): ModelEffort {
  if (context.taskType === ModelTaskType.Creative || context.requiresReasoning) {
    return ModelEffortLevel.High
  }
  if (context.taskType === ModelTaskType.Complex || context.hasToolCalls) {
    return ModelEffortLevel.Medium
  }
  return ModelEffortLevel.Low
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

/** Pipeline + product roles with env overrides (STORYTELLER_<ROLE>_MODEL). */
export enum StorytellerModelRoleKey {
  Author = 'author',
  Planner = 'planner',
  Critic = 'critic',
  Muse = 'muse',
  Premise = 'premise',
  Chat = 'chat',
}

export type StorytellerModelRole = `${StorytellerModelRoleKey}`

export enum StorytellerRoleEnvVar {
  Author = 'STORYTELLER_AUTHOR_MODEL',
  Planner = 'STORYTELLER_PLANNER_MODEL',
  Critic = 'STORYTELLER_CRITIC_MODEL',
  Muse = 'STORYTELLER_MUSE_MODEL',
  Premise = 'STORYTELLER_PREMISE_MODEL',
  Chat = 'STORYTELLER_CHAT_MODEL',
}

export const ROLE_ENV_VARS: Record<StorytellerModelRole, string> = {
  [StorytellerModelRoleKey.Author]: StorytellerRoleEnvVar.Author,
  [StorytellerModelRoleKey.Planner]: StorytellerRoleEnvVar.Planner,
  [StorytellerModelRoleKey.Critic]: StorytellerRoleEnvVar.Critic,
  [StorytellerModelRoleKey.Muse]: StorytellerRoleEnvVar.Muse,
  [StorytellerModelRoleKey.Premise]: StorytellerRoleEnvVar.Premise,
  [StorytellerModelRoleKey.Chat]: StorytellerRoleEnvVar.Chat,
}

const STORYTELLER_ROLES = new Set<string>(Object.keys(ROLE_ENV_VARS))

function isStorytellerRole(agentId: string): agentId is StorytellerModelRole {
  return STORYTELLER_ROLES.has(agentId)
}

function roleSpec(role: StorytellerModelRole): ModelRoleSpec {
  return { role, envVar: ROLE_ENV_VARS[role] }
}

/**
 * Which roles the Writers Room picker may retarget. Prose and story structure
 * follow the writer; the cheap tier (critics, muse) stays where it is pinned,
 * so one picker choice cannot make a diagnose-only pass expensive.
 */
const WRITER_CHOICE_ROLES: Record<StorytellerModelRole, boolean> = {
  chat: true,
  author: true,
  planner: true,
  premise: true,
  critic: false,
  muse: false,
}

/**
 * The picker choice for this request, carried on the gateway context so it
 * reaches workflow steps (author, planner) that take no RequestContext.
 */
function writerChoiceFor(role: StorytellerModelRole): string | undefined {
  if (!WRITER_CHOICE_ROLES[role]) return undefined
  const picked = currentGatewayContext()?.writerModel
  return picked && isKnownChatModel(picked) ? picked : undefined
}

/**
 * The operator env override alone, for `getAgentModelConfig`, which wants only
 * that layer of the chain. The full precedence lives in the gateway registry.
 */
function roleEnvOverride(agentId: string): string | undefined {
  if (!isStorytellerRole(agentId)) return undefined
  return resolveConfiguredModelId({ role: '', envVar: ROLE_ENV_VARS[agentId] })
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
    rationale: AgentModelFallbackRationale.Default,
  }
  const override = roleEnvOverride(agentId)
  return override ? { ...base, model: override } : base
}

/**
 * Resolve a role to the model config Mastra's `Agent({ model })` accepts —
 * a `provider/model` gateway string, or a `{ url, id, apiKey }` object for
 * endpoint models (GLM via Z.AI Coding Plan). THE single role-resolution
 * path (item 57): user override → env override → matrix lane.
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
  const validatedOverride =
    (overrideId && isKnownChatModel(overrideId) ? overrideId : undefined) ?? writerChoiceFor(role)
  // Single-key OpenRouter: per-request picker → admin panel setting → operator
  // env override (STORYTELLER_<ROLE>_MODEL) → the role's lane in the matrix. All
  // routed through the same gateway. The matrix also supplies
  // temperature/topP/rationale. The precedence chain itself is the gateway
  // registry's; this file supplies the role's env var and the lane default.
  const explicit = resolveConfiguredModelId(roleSpec(role), validatedOverride)
  const resolved = resolveStorytellerModel(
    explicit ?? AGENT_MODEL_MATRIX[role]?.model ?? DEFAULT_CHAT_MODEL
  )
  if (!isE2eLlmPinned()) return resolved
  if (typeof resolved === 'string') {
    return isE2eBannedModelId(resolved) ? E2ePinnedChatModel.GatewayId : resolved
  }
  return isE2eBannedModelId(resolved.id) ? E2ePinnedChatModel.GatewayId : resolved
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
    getConfiguredModel(StorytellerModelRoleKey.Author) ??
    env.STORYTELLER_AUTHOR_MODEL ??
    DEFAULT_CHAT_MODEL
  const option = getChatModelOption(catalogOrOpenRouterId)
  return toOpenRouterModelId(option?.openRouterId ?? catalogOrOpenRouterId)
}

