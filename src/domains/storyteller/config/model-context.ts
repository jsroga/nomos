/**
 * Model Context using AsyncLocalStorage
 *
 * Provides request-scoped model configuration for server-side agents.
 * This allows the frontend Settings UI to control which LLM provider
 * is used without modifying any agent code.
 *
 * Usage:
 * - API routes call runWithModelConfig() to set the context
 * - getModel() reads from this context automatically
 * - Adding new providers only requires updating model-config.ts
 *
 * Note: This module is isomorphic - it works on both client and server.
 * On the client, the context functions are no-ops since model selection
 * happens server-side.
 */

export type ModelProvider = 'openai' | 'anthropic' | 'gemini'

export interface ModelConfig {
  provider: ModelProvider
  anthropicApiKey?: string
  geminiApiKey?: string
}

// Type for AsyncLocalStorage (only available on server)
type AsyncLocalStorageType<T> = {
  run: <R>(store: T, callback: () => R) => R
  getStore: () => T | undefined
}

// Lazy-loaded AsyncLocalStorage instance (server-only)
let modelConfigStorage: AsyncLocalStorageType<ModelConfig> | null = null

function getStorage(): AsyncLocalStorageType<ModelConfig> | null {
  // Only load AsyncLocalStorage on the server
  if (typeof window !== 'undefined') {
    return null
  }

  if (!modelConfigStorage) {
    try {
      // Dynamic import to avoid bundling async_hooks for client

      const { AsyncLocalStorage } = require('async_hooks')
      const ALS = AsyncLocalStorage as any
      modelConfigStorage = new ALS() as AsyncLocalStorageType<ModelConfig>
    } catch {
      // Fallback if async_hooks is not available
      return null
    }
  }

  return modelConfigStorage
}

/**
 * Run a function with model configuration in context.
 * All calls to getModel() within this context will use the provided config.
 * On client-side, this just runs the function directly (no-op for context).
 */
export function runWithModelConfig<T>(config: ModelConfig, fn: () => T): T {
  const storage = getStorage()
  if (storage) {
    return storage.run(config, fn)
  }
  // Client-side or fallback: just run the function
  return fn()
}

/**
 * Run an async function with model configuration in context.
 */
export async function runWithModelConfigAsync<T>(
  config: ModelConfig,
  fn: () => Promise<T>
): Promise<T> {
  const storage = getStorage()
  if (storage) {
    return storage.run(config, fn)
  }
  // Client-side or fallback: just run the function
  return fn()
}

/**
 * Get the current model configuration from context.
 * Returns undefined if not running within a runWithModelConfig() call
 * or if called on the client side.
 */
export function getModelConfig(): ModelConfig | undefined {
  const storage = getStorage()
  return storage?.getStore()
}

/**
 * Get the current provider from context, with fallback.
 */
export function getContextProvider(): ModelProvider | undefined {
  return getModelConfig()?.provider
}

/**
 * Get the Anthropic API key from context.
 */
export function getContextAnthropicKey(): string | undefined {
  return getModelConfig()?.anthropicApiKey
}

/**
 * Get the Gemini API key from context.
 */
export function getContextGeminiKey(): string | undefined {
  return getModelConfig()?.geminiApiKey
}
