import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'

export type ModelProvider = 'openai' | 'anthropic' | 'google'

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
export const GLOBAL_AGENT_MODEL = process.env.NEXT_PUBLIC_DEFAULT_AGENT_MODEL || 'openai:gpt-4o-mini'

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

export const AGENT_MODEL_MATRIX: Record<string, AgentModelConfig> = {
    // === TIER 1: CHEAP + FAST (analysis, scoring, structured output) ===
    'psychologist': {
        model: 'openai:gpt-4o-mini',
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 2000,
        rationale: 'Structured JSON output (metrics, goals, fears). No creativity needed.',
    },
    'consequence': {
        model: 'openai:gpt-4o-mini',
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 2000,
        rationale: 'Causality tracking = structured logic, not prose.',
    },
    'consequence-scoring': {
        model: 'openai:gpt-4o-mini',
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 2000,
        rationale: 'Quality scoring needs nuanced judgment. Escalate from mini for scoreQuality() calls.',
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
        model: 'openai:gpt-4o-mini',
        temperature: 0.6,
        topP: 0.9,
        maxOutputTokens: 2500,
        rationale: 'Critique requires some creative thinking but mostly analysis. Mini is fast and capable enough.',
    },
    'gardener-standard': {
        model: 'openai:gpt-4o-mini',
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 6000,
        rationale: 'Standard scene writing (setup, complication beats). Mini handles well at lower cost.',
    },
    'autocomplete': {
        model: 'openai:gpt-4o-mini',
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 200,
        rationale: 'Ghost-text completions must be FAST (<500ms). Mini is fastest. Short output.',
    },

    // === TIER 3: FULL CREATIVE POWER (important scenes, orchestration) ===
    'storyteller': {
        model: 'openai:gpt-4o-mini',
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 4000,
        rationale: 'Orchestrator needs tool calling + reasoning + creativity. GPT-4o is the best balance.',
    },
    'premise-architect': {
        model: 'openai:gpt-4o-mini',
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 8000,
        rationale: 'Premise generation needs structural + creative power.',
    },

    // === TIER 4: PRESTIGE (climactic scenes, refinement passes) ===
    'gardener-climax': {
        model: 'anthropic:claude-sonnet-4-20250514',
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 8000,
        rationale: 'Climactic scenes (resolution, revelation, decision in final 20%) deserve best prose model.',
    },
    'gardener-refinement': {
        model: 'anthropic:claude-sonnet-4-20250514',
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 6000,
        rationale: 'Refinement passes after failed quality gate. Claude excels at targeted rewrites.',
    },

    // === TIER 5: REASONING (complex planning, multi-step logic) ===
    'storyteller-complex': {
        model: 'openai:gpt-5.2',
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 4000,
        rationale: 'Multi-step planning, complex tool chains. GPT-5.2 has best reasoning + cached input discount.',
    },
}

/**
 * Get the model config for a specific agent role.
 * Falls back to the global default if no specific config exists.
 */
export function getAgentModelConfig(agentId: string): AgentModelConfig {
    return AGENT_MODEL_MATRIX[agentId] || {
        model: GLOBAL_AGENT_MODEL,
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 4000,
        rationale: 'Default fallback',
    }
}

/**
 * Determine effort level from beat importance.
 * For EXISTING beats with known type and position.
 */
export function inferEffortFromBeat(context: {
    beatType?: string
    beatPosition?: number    // 0-1, position in episode
    totalBeats?: number
    hasCharacterDeath?: boolean
    hasMajorRevelation?: boolean
}): { effort: ModelEffort; requiresMultiPass: boolean } {
    const isClimax = (context.beatPosition ?? 0) > 0.8
    const isHighStakes = context.beatType === 'resolution'
        || context.beatType === 'revelation'
        || context.beatType === 'decision'
        || context.hasCharacterDeath
        || context.hasMajorRevelation

    if (isClimax || isHighStakes) {
        return { effort: 'high', requiresMultiPass: true }
    }

    if (context.beatType === 'complication' || context.beatType === 'consequence') {
        return { effort: 'medium', requiresMultiPass: false }
    }

    return { effort: 'low', requiresMultiPass: false }
}

/**
 * Determine effort level from user message text.
 * Fallback for NEW beats where type is unknown.
 */
export function inferEffortFromMessage(message: string): { effort: ModelEffort; requiresMultiPass: boolean } {
    const climaxSignals = /\b(climax|climactic|confrontation|final|reveal|death|betray|twist|peak|emotional peak|turning point)\b/i
    const highStakes = climaxSignals.test(message)
    return highStakes
        ? { effort: 'high', requiresMultiPass: true }
        : { effort: 'medium', requiresMultiPass: false }
}

/**
 * Estimate cost for a model call based on token usage.
 * Rates are per 1M tokens (2026 pricing).
 */
export function estimateCost(model: string, usage: { promptTokens?: number; completionTokens?: number }): number {
    const rates: Record<string, { input: number; output: number }> = {
        'openai:gpt-4o': { input: 2.50, output: 10.00 },
        'openai:gpt-4o-mini': { input: 0.15, output: 0.60 },
        'openai:gpt-5.2': { input: 1.75, output: 14.00 },
        'anthropic:claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
        'google:gemini-2.5-flash': { input: 0.30, output: 2.50 },
    }
    const rate = rates[model] || rates['openai:gpt-4o']
    const promptTokens = usage.promptTokens || 0
    const completionTokens = usage.completionTokens || 0
    return (promptTokens * rate.input + completionTokens * rate.output) / 1_000_000
}
