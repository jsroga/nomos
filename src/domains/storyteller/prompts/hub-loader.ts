/**
 * LangSmith Prompt Hub Loader
 *
 * Centralized prompt management using LangSmith Hub.
 * Supports version control, environment tags, and fallback to local prompts.
 */

import { pull } from 'langchain/hub'
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts'
import {
  getPromptConfig,
  getPromptHubPath,
  PROMPT_IDS,
  STORYTELLER_CONFIG,
} from '../config/storyteller-config'

// ============================================
// TYPES
// ============================================

export type PromptEnvironment = 'production' | 'staging' | 'dev'

export interface LoadedPrompt {
  prompt: ChatPromptTemplate | PromptTemplate
  source: 'hub' | 'local'
  version?: string
  environment: PromptEnvironment
}

export type AgentPrompts = Record<keyof typeof PROMPT_IDS, LoadedPrompt>

// ============================================
// HUB LOADER
// ============================================

/**
 * Load a single prompt from LangSmith Hub
 */
export async function loadPromptFromHub(
  promptId: keyof typeof PROMPT_IDS,
  environment?: PromptEnvironment
): Promise<LoadedPrompt> {
  const config = getPromptConfig()
  const env = environment || config.environment

  // Enforce Hub usage
  if (!config.useHub) {
    throw new Error(
      `[Prompt Hub] Hub usage is disabled but strict mode is on. Enable STORYTELLER_USE_PROMPT_HUB.`
    )
  }

  try {
    const hubPath = getPromptHubPath(promptId, env)

    if (STORYTELLER_CONFIG.debug.verboseLogging) {
      console.log(`[Prompt Hub] Loading: ${hubPath}`)
    }

    const prompt = await pull<ChatPromptTemplate>(hubPath)

    return {
      prompt,
      source: 'hub',
      environment: env,
    }
  } catch (error) {
    console.error(`[Prompt Hub] Failed to load ${promptId} from Hub:`, error)

    // In strict mode (default), we propagate the error
    if (!config.fallbackToLocal) {
      throw new Error(
        `[Prompt Hub] Failed to load prompt "${promptId}" from LangSmith Hub. 
            Check your internet connection and LANGCHAIN_API_KEY. 
            Error: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    // Minimal fail-safe only if strictly requested (runtime override)
    console.warn(`[Prompt Hub] Using generic fail-safe for "${promptId}"`)
    return {
      prompt: ChatPromptTemplate.fromTemplate(
        'System is currently offline or Hub is unreachable. Please check configuration.'
      ),
      source: 'local',
      environment: env,
    }
  }
}

/**
 * Load a prompt pinned to a specific version
 */
export async function loadPromptVersion(
  promptId: keyof typeof PROMPT_IDS,
  version: string
): Promise<LoadedPrompt> {
  const config = getPromptConfig()
  const hubPath = `${config.hubOwner}/${PROMPT_IDS[promptId]}@${version}`

  try {
    const prompt = await pull<ChatPromptTemplate>(hubPath)

    return {
      prompt,
      source: 'hub',
      version,
      environment: config.environment,
    }
  } catch (error) {
    throw new Error(
      `[Prompt Hub] Failed to load version ${version} of "${promptId}". 
        Error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Load all agent prompts
 */
export async function loadAgentPrompts(environment?: PromptEnvironment): Promise<AgentPrompts> {
  const env = environment || getPromptConfig().environment
  const promptIds = Object.keys(PROMPT_IDS) as Array<keyof typeof PROMPT_IDS>

  const loadedPrompts: Partial<AgentPrompts> = {}

  // Load all prompts in parallel
  await Promise.all(
    promptIds.map(async id => {
      loadedPrompts[id] = await loadPromptFromHub(id, env)
    })
  )

  return loadedPrompts as AgentPrompts
}

// ============================================
// CACHING
// ============================================

// Cache loaded prompts to avoid repeated Hub calls
const promptCache = new Map<string, { prompt: LoadedPrompt; loadedAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Load a prompt with caching
 */
export async function loadPromptCached(
  promptId: keyof typeof PROMPT_IDS,
  environment?: PromptEnvironment
): Promise<LoadedPrompt> {
  const env = environment || getPromptConfig().environment
  const cacheKey = `${promptId}:${env}`

  const cached = promptCache.get(cacheKey)
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.prompt
  }

  const prompt = await loadPromptFromHub(promptId, env)
  promptCache.set(cacheKey, { prompt, loadedAt: Date.now() })

  return prompt
}

/**
 * Clear the prompt cache
 */
export function clearPromptCache(): void {
  promptCache.clear()
  console.log('[Prompt Hub] Cache cleared')
}

/**
 * Invalidate a specific prompt in cache
 */
export function invalidatePrompt(
  promptId: keyof typeof PROMPT_IDS,
  environment?: PromptEnvironment
): void {
  const env = environment || getPromptConfig().environment
  const cacheKey = `${promptId}:${env}`
  promptCache.delete(cacheKey)
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if Hub is available and configured
 */
export function isHubAvailable(): boolean {
  return !!process.env.LANGCHAIN_API_KEY && getPromptConfig().useHub
}

/**
 * Get the Hub URL for a prompt (for UI links)
 */
export function getPromptHubUrl(promptId: keyof typeof PROMPT_IDS): string {
  const config = getPromptConfig()
  return `https://smith.langchain.com/hub/${config.hubOwner}/${PROMPT_IDS[promptId]}`
}

/**
 * List all prompt IDs
 */
export function listPromptIds(): Array<keyof typeof PROMPT_IDS> {
  return Object.keys(PROMPT_IDS) as Array<keyof typeof PROMPT_IDS>
}
