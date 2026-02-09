/**
 * Langfuse Prompt Sync Utility
 *
 * Syncs prompts between local registry and Langfuse.
 * Supports:
 * - Push local prompts to Langfuse
 * - Pull prompts from Langfuse to local
 * - Version management
 */

import { langfuse } from '../agent-core/observability'
import { PromptDefinition } from './types'
import { getErrorMessage } from '@/lib/error-utils'

export interface LangfuseSyncOptions {
  /** Only sync prompts with these tags */
  filterTags?: string[]
  /** Overwrite existing prompts in Langfuse */
  overwrite?: boolean
  /** Dry run - don't actually push */
  dryRun?: boolean
}

export interface SyncResult {
  pushed: string[]
  skipped: string[]
  errors: Array<{ name: string; error: string }>
}

/**
 * Push a single prompt to Langfuse
 */
export async function pushPromptToLangfuse(
  definition: PromptDefinition,
  options: LangfuseSyncOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const { dryRun = false } = options

  if (dryRun) {
    console.log(`[DRY RUN] Would push prompt: ${definition.name} v${definition.version}`)
    return { success: true }
  }

  try {
    // Create prompt in Langfuse
    await langfuse.createPrompt({
      name: definition.name,
      prompt: definition.text,
      labels: definition.tags || [],
      config: definition.modelConfig
        ? {
            temperature: definition.modelConfig.temperature,
            maxTokens: definition.modelConfig.maxTokens,
            model: definition.modelConfig.model,
          }
        : undefined,
    })

    console.log(`[Langfuse] Pushed prompt: ${definition.name}`)
    return { success: true }
  } catch (error: unknown) {
    // Handle "prompt already exists" gracefully
    if (getErrorMessage(error)?.includes('already exists')) {
      console.log(`[Langfuse] Prompt already exists: ${definition.name}`)
      return { success: true }
    }

    console.error(`[Langfuse] Failed to push prompt ${definition.name}:`, getErrorMessage(error))
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Push multiple prompts to Langfuse
 */
export async function pushPromptsToLangfuse(
  definitions: PromptDefinition[],
  options: LangfuseSyncOptions = {}
): Promise<SyncResult> {
  const result: SyncResult = {
    pushed: [],
    skipped: [],
    errors: [],
  }

  const { filterTags } = options

  for (const definition of definitions) {
    // Filter by tags if specified
    if (filterTags && filterTags.length > 0) {
      const hasMatchingTag = definition.tags?.some(tag => filterTags.includes(tag))
      if (!hasMatchingTag) {
        result.skipped.push(definition.name)
        continue
      }
    }

    const { success, error } = await pushPromptToLangfuse(definition, options)

    if (success) {
      result.pushed.push(definition.name)
    } else {
      result.errors.push({ name: definition.name, error: error || 'Unknown error' })
    }
  }

  return result
}

/**
 * Fetch a prompt from Langfuse
 */
async function fetchPromptFromLangfuse(
  name: string,
  version?: number
): Promise<{ prompt: string; config?: Record<string, unknown> } | null> {
  try {
    const prompt = await langfuse.getPrompt(name, version)
    return {
      prompt: prompt.prompt,
      config: prompt.config as Record<string, unknown> | undefined,
    }
  } catch (error: unknown) {
    console.warn(`[Langfuse] Failed to fetch prompt ${name}:`, getErrorMessage(error))
    return null
  }
}

/**
 * Compile a Langfuse prompt with variables
 */
export async function compileLangfusePrompt(
  name: string,
  variables: Record<string, string | number | boolean> = {},
  version?: number
): Promise<string | null> {
  try {
    const prompt = await langfuse.getPrompt(name, version)
    // Convert all values to strings for Langfuse SDK compatibility
    const stringVars: Record<string, string> = {}
    for (const [key, value] of Object.entries(variables)) {
      stringVars[key] = String(value)
    }
    return prompt.compile(stringVars)
  } catch (error: unknown) {
    console.warn(`[Langfuse] Failed to compile prompt ${name}:`, getErrorMessage(error))
    return null
  }
}

/**
 * List all prompts from Langfuse (requires API access)
 */
async function listLangfusePrompts(): Promise<string[]> {
  // Note: Langfuse SDK doesn't provide a list method directly
  // This would require using the REST API
  console.warn('[Langfuse] List prompts not implemented - use Langfuse UI')
  return []
}
