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
    medium: 'openai:gpt-4o',
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
        ;(model as any).specificationVersion = specVersion
        return model
    }

    // 2. Handle Anthropic
    if (modelName.startsWith('anthropic:')) {
        const modelId = modelName.replace('anthropic:', '')
        const anthropic = createAnthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        })
        const model = anthropic(modelId)
        ;(model as any).specificationVersion = specVersion
        return model
    }

    // 3. Handle Google (Gemini)
    if (modelName.startsWith('google:')) {
        const modelId = modelName.replace('google:', '')
        const model = google(modelId)
        ;(model as any).specificationVersion = specVersion
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
export const GLOBAL_AGENT_MODEL = process.env.NEXT_PUBLIC_DEFAULT_AGENT_MODEL || 'openai:gpt-4o'

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
