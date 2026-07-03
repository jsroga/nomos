import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'

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
  high: 'anthropic:claude-sonnet-4-20250514', // Claude 4.5 Sonnet
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
    modelName = getModelByEffort(modelName as ModelEffort)
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
      ; (model as any).specificationVersion = specVersion
    return model
  }

  // 2. Handle Anthropic
  if (modelName.startsWith('anthropic:')) {
    const modelId = modelName.replace('anthropic:', '')
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
    const model = anthropic(modelId)
      ; (model as any).specificationVersion = specVersion
    return model
  }

  // 3. Handle Google (Gemini)
  if (modelName.startsWith('google:')) {
    const modelId = modelName.replace('google:', '')
    const model = google(modelId)
      ; (model as any).specificationVersion = specVersion
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
  process.env.NEXT_PUBLIC_DEFAULT_AGENT_MODEL || 'openai:gpt-4o-mini'

/**
 * Model fallback configuration for resilience
 * See: https://mastra.ai/models#model-fallbacks
 *
 * If primary model fails, automatically falls back to next in chain
 */
export const MODEL_FALLBACKS = [
  { model: 'openai/gpt-4o', maxRetries: 3 },
  { model: 'anthropic/claude-sonnet-4-20250514', maxRetries: 2 },
  { model: 'google/gemini-2.5-flash', maxRetries: 2 },
]

/**
 * Get model string for Mastra's unified API format
 * Converts 'openai:gpt-4o' to 'openai/gpt-4o'
 */
export function toMastraModelString(modelName: string): string {
  return modelName.replace(':', '/')
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
  model: 'openai:gpt-4o',
  /** Max tool-call iterations per generate() for multi-step agents. */
  maxSteps: 10,
  /** Fallback sampling when no per-agent matrix entry exists. */
  temperature: 0.7,
  topP: 0.9,
} as const

export const AGENT_MODEL_MATRIX: Record<string, AgentModelConfig> = {
  // === TIER 1: CHEAP + FAST (analysis, scoring, structured output) ===
  psychologist: {
    model: 'anthropic:claude-4-5-sonnet-20250101',
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
    model: 'anthropic:claude-4-5-sonnet-20250101',
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
    model: 'anthropic:claude-4-5-sonnet-20250101',
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
    model: 'anthropic:claude-4-5-sonnet-20250101',
    temperature: 0.78,
    topP: 0.93,
    maxOutputTokens: 8000,
    rationale:
      'Climactic scenes get slightly higher temp for peak creativity, but still controlled.',
  },
  'gardener-refinement': {
    model: 'anthropic:claude-4-5-sonnet-20250101',
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
}

/**
 * Get the model config for a specific agent role.
 * Falls back to the global default if no specific config exists.
 */
export function getAgentModelConfig(agentId: string): AgentModelConfig {
  return (
    AGENT_MODEL_MATRIX[agentId] || {
      model: GLOBAL_AGENT_MODEL,
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 4000,
      rationale: 'Default fallback',
    }
  )
}

