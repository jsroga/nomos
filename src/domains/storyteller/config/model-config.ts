/**
 * Model Configuration System
 *
 * Provides a unified interface for getting LLM models based on user preference.
 * Supports Claude 4.5 Sonnet, GPT-5.1, and Gemini.
 * 
 * Uses AsyncLocalStorage to receive config from API routes, allowing the
 * Settings UI to control which provider is used server-side.
 */

import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { z } from 'zod'
import { LocalStorageKeys } from '@/constants/localStorage'

// Lazy context getters to avoid importing async_hooks on client side
function getContextProvider(): import('./model-context').ModelProvider | undefined {
  if (typeof window !== 'undefined') return undefined
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getContextProvider: fn } = require('./model-context')
    return fn()
  } catch {
    return undefined
  }
}

function getContextAnthropicKey(): string | undefined {
  if (typeof window !== 'undefined') return undefined
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getContextAnthropicKey: fn } = require('./model-context')
    return fn()
  } catch {
    return undefined
  }
}

function getContextGeminiKey(): string | undefined {
  if (typeof window !== 'undefined') return undefined
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getContextGeminiKey: fn } = require('./model-context')
    return fn()
  } catch {
    return undefined
  }
}

export type ModelProvider = 'openai' | 'anthropic' | 'gemini'
export type AgentRole =
  | 'showrunner'
  | 'plotArchitect'
  | 'characterPsychology'
  | 'consequenceTracker'
  | 'devilsAdvocate'
  | 'visualMoment'
  | 'writer'
  | 'premiseArchitect'
  | 'default'

// Model configurations per provider
const MODEL_CONFIGS = {
  openai: {
    model: 'gpt-5.1',
    // Role-specific temperature overrides
    temperatures: {
      showrunner: 0.7,
      plotArchitect: 0.95, // Max creativity
      characterPsychology: 0.8,
      consequenceTracker: 0.7,
      devilsAdvocate: 0.95, // Harsh critic
      visualMoment: 0.9,
      writer: 0.85,
      premiseArchitect: 0.85,
      default: 0.8,
    },
  },
  anthropic: {
    model: 'claude-sonnet-4-20250514',
    // Claude tends to be more creative at lower temps
    temperatures: {
      showrunner: 0.7,
      plotArchitect: 0.9,
      characterPsychology: 0.75,
      consequenceTracker: 0.6,
      devilsAdvocate: 0.9,
      visualMoment: 0.85,
      writer: 0.8,
      premiseArchitect: 0.8,
      default: 0.75,
    },
  },
  gemini: {
    model: 'gemini-3-pro-preview',
    temperatures: {
      showrunner: 0.7,
      plotArchitect: 0.9,
      characterPsychology: 0.8,
      consequenceTracker: 0.7,
      devilsAdvocate: 0.9,
      visualMoment: 0.85,
      writer: 0.8,
      premiseArchitect: 0.85,
      default: 0.8,
    },
  },
} as const

// Get the preferred provider from context, environment, or localStorage
function getPreferredProvider(): ModelProvider {
  // 1. Check request context first (AsyncLocalStorage - set by API routes)
  const contextProvider = getContextProvider()
  if (contextProvider) {
    return contextProvider
  }

  // 2. Check environment variable
  const envProvider = process.env.PREFERRED_MODEL_PROVIDER
  if (envProvider === 'anthropic' || envProvider === 'openai' || envProvider === 'gemini') {
    return envProvider
  }

  // 3. In browser, check localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(LocalStorageKeys.PREFERRED_MODEL_PROVIDER)
    if (stored === 'anthropic' || stored === 'openai' || stored === 'gemini') {
      return stored as ModelProvider
    }
  }

  // Default to OpenAI
  return 'openai'
}

// Check if we have the necessary API key for a provider
function hasApiKey(provider: ModelProvider): boolean {
  if (provider === 'openai') {
    return !!process.env.OPENAI_API_KEY
  }
  if (provider === 'anthropic') {
    // Check context first (from API request)
    const contextKey = getContextAnthropicKey()
    if (contextKey) return true
    // Check env
    if (process.env.ANTHROPIC_API_KEY) return true
    // Check localStorage (browser only)
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem(LocalStorageKeys.ANTHROPIC_API_KEY)
    }
  }
  if (provider === 'gemini') {
    // Check context first (from API request)
    const contextKey = getContextGeminiKey()
    if (contextKey) return true
    // Check env
    if (process.env.GOOGLE_API_KEY) return true
    // Check localStorage (browser only) - uses existing AI_CONFIG_GEMINI structure
    if (typeof window !== 'undefined') {
      const geminiConfig = localStorage.getItem(LocalStorageKeys.AI_CONFIG_GEMINI)
      if (geminiConfig) {
        try {
          const parsed = JSON.parse(geminiConfig)
          return !!parsed.apiKey
        } catch {
          return false
        }
      }
    }
  }
  return false
}

// Get Anthropic API key from context, environment, or localStorage
function getAnthropicApiKey(): string | undefined {
  // 1. Check request context first (from API request)
  const contextKey = getContextAnthropicKey()
  if (contextKey) {
    return contextKey
  }
  // 2. Check environment variable
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY
  }
  // 3. Check localStorage (browser only)
  if (typeof window !== 'undefined') {
    return localStorage.getItem(LocalStorageKeys.ANTHROPIC_API_KEY) || undefined
  }
  return undefined
}

// Get Gemini API key from context, environment, or localStorage
function getGeminiApiKey(): string | undefined {
  // 1. Check request context first (from API request)
  const contextKey = getContextGeminiKey()
  if (contextKey) {
    return contextKey
  }
  // 2. Check environment variable
  if (process.env.GOOGLE_API_KEY) {
    return process.env.GOOGLE_API_KEY
  }
  // 3. Check localStorage (browser only) - uses existing AI_CONFIG_GEMINI structure
  if (typeof window !== 'undefined') {
    const geminiConfig = localStorage.getItem(LocalStorageKeys.AI_CONFIG_GEMINI)
    if (geminiConfig) {
      try {
        const parsed = JSON.parse(geminiConfig)
        return parsed.apiKey || undefined
      } catch {
        return undefined
      }
    }
  }
  return undefined
}

/**
 * Get a configured LLM model for the specified agent role
 */
export function getModel(role: AgentRole = 'default'): BaseChatModel {
  let provider = getPreferredProvider()

  // Fall back logic - try to find an available provider
  if (!hasApiKey(provider)) {
    const fallbackOrder: ModelProvider[] = ['openai', 'anthropic', 'gemini']
    const available = fallbackOrder.find(p => hasApiKey(p))
    if (available) {
      console.warn(`${provider} API key not found, falling back to ${available}`)
      provider = available
    }
  }

  const config = MODEL_CONFIGS[provider]
  const temperature = config.temperatures[role] ?? config.temperatures.default

  if (provider === 'anthropic') {
    return new ChatAnthropic({
      modelName: config.model,
      temperature,
      maxRetries: 2,
      anthropicApiKey: getAnthropicApiKey(),
    })
  }

  if (provider === 'gemini') {
    return new ChatGoogleGenerativeAI({
      model: config.model,
      temperature,
      maxRetries: 2,
      apiKey: getGeminiApiKey(),
    })
  }

  // Default to OpenAI
  return new ChatOpenAI({
    modelName: config.model,
    temperature,
    maxRetries: 3,
  })
}

/**
 * Get model info for display in UI
 */
export function getModelInfo(): { provider: ModelProvider; model: string; hasKey: boolean } {
  const provider = getPreferredProvider()
  const config = MODEL_CONFIGS[provider]

  return {
    provider,
    model: config.model,
    hasKey: hasApiKey(provider),
  }
}

/**
 * Set the preferred model provider (for use in settings)
 */
export function setPreferredProvider(provider: ModelProvider): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LocalStorageKeys.PREFERRED_MODEL_PROVIDER, provider)
  }
}

/**
 * Set Anthropic API key (for use in settings)
 */
export function setAnthropicApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LocalStorageKeys.ANTHROPIC_API_KEY, key)
  }
}

/**
 * Get current model name for display
 */
export function getCurrentModelName(): string {
  const provider = getPreferredProvider()
  const model = MODEL_CONFIGS[provider].model // Get the actual model name

  if (provider === 'anthropic') {
    return 'Claude Sonnet 4'
  }
  if (provider === 'gemini') {
    return 'Gemini 2.5 Pro'
  }
  if (model.includes('gpt-5.1') || model.includes('gpt-4o')) {
    return 'GPT-5.1'
  }
  return 'GPT-4.1'
}

/**
 * Get a model configured for structured output with a Zod schema
 */
export function getModelWithStructuredOutput<T extends z.ZodType>(
  schema: T,
  role: AgentRole = 'default'
): ReturnType<BaseChatModel['withStructuredOutput']> {
  const model = getModel(role)
  return model.withStructuredOutput(schema, {
    name: `${role}_response`,
    strict: true,
  })
}

/**
 * Invoke model with structured output and fallback
 */
export async function invokeWithStructuredOutput<T>(
  model: BaseChatModel,
  messages: any[],
  schema: z.ZodType<T>,
  fallback: T
): Promise<T> {
  try {
    const structuredModel = model.withStructuredOutput(schema)
    const result = await structuredModel.invoke(messages)
    return result as T
  } catch (error) {
    console.warn('Structured output failed, using fallback:', error)
    return fallback
  }
}
