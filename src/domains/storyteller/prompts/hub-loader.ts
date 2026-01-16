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
// LOCAL FALLBACK PROMPTS
// ============================================

// These are minimal fallbacks - actual prompts should be in LangSmith Hub
const LOCAL_PROMPTS: Record<keyof typeof PROMPT_IDS, string> = {
  supervisor: `You are the Showrunner, coordinating the creative team.
Your job is to route requests to the appropriate specialist agent.
Analyze the request and delegate to:
- PremiseArchitect for world-building and character creation
- PlotArchitect for story structure and episode arcs
- Writer for dialogue and scene writing
- CharacterPsychology for character motivation analysis
- DevilsAdvocate for critical review
- ConsequenceTracker for continuity checks

User request: {input}`,

  plotArchitect: `You are the Plot Architect, responsible for story structure.
Analyze story elements and suggest compelling plot developments.
Focus on causality, stakes, and character agency.

Context: {context}
Request: {input}`,

  writer: `You are the Writer, crafting authentic dialogue and scenes.
Write natural, subtext-laden dialogue. Avoid exposition dumps.
Show emotions through behavior, not statements.

Context: {context}
Request: {input}`,

  premiseArchitect: `You are the Premise Architect, building coherent worlds.
Establish rules, settings, and characters that work together.
Ensure internal consistency across all elements.

Context: {context}
Request: {input}`,

  characterPsychology: `You are the Character Psychology expert.
Analyze character motivations, arcs, and voice consistency.
Ensure characters act from their established nature.

Context: {context}
Request: {input}`,

  devilsAdvocate: `You are the Devil's Advocate, the critical reviewer.
Challenge content for logic, character consistency, and quality.
Identify plot holes and suggest specific fixes.

Context: {context}
Request: {input}`,

  scriptEditor: `You are the Script Editor, polishing final scripts.
Tighten dialogue, ensure proper formatting, improve flow.
Maintain the writer's voice while enhancing quality.

Context: {context}
Request: {input}`,

  consequenceTracker: `You are the Consequence Tracker, maintaining continuity.
Track events, decisions, and their ripple effects.
Flag inconsistencies with established story facts.

Context: {context}
Request: {input}`,

  episodePremiseArchitect: `You are the Episode Premise Architect.
Generate high-stakes, transformative episode premises.
Focus on conflict, change, and thematic depth.

Context: {context}
Request: {input}`,

  planner: `You are the Planner, breaking down complex requests.
Decompose user requests into atomic, actionable steps.
Sequence tasks logically based on dependencies.

User request: {input}`,

  // Section fallbacks
  sectionWorldRules: 'Generate world rules. Context: {input}',
  sectionWorldDescription: 'Generate world description. Context: {input}',
  sectionFactions: 'Generate factions. Context: {input}',
  sectionInspirations: 'Generate inspirations. Context: {input}',
  sectionPlotTwists: 'Generate plot twists. Context: {input}',
  sectionEpisodeRoadmap: 'Generate episode roadmap. Context: {input}',
  sectionKeyCharacters: 'Generate key characters. Context: {input}',
  sectionSoundtracks: 'Generate soundtracks. Context: {input}',

  // Additional agents
  magicAgent:
    'You are the Magic Agent, generating creative ideas. Context: {context} Request: {input}',
  worldSimulator:
    'You are the World Simulator, simulating world events. Context: {context} Request: {input}',
  visualMoment: 'You are the Visual Moment specialist. Context: {context} Request: {input}',
}

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

  // If Hub is disabled, use local
  if (!config.useHub) {
    const localPrompt = LOCAL_PROMPTS[promptId]

    if (!localPrompt) {
      console.warn(`[Prompt Hub] Local prompt "${promptId}" not found, using generic fallback`)
      return {
        prompt: ChatPromptTemplate.fromTemplate(
          'You are a helpful AI assistant. Context: {context} Request: {input}'
        ),
        source: 'local',
        environment: env,
      }
    }

    return {
      prompt: ChatPromptTemplate.fromTemplate(localPrompt),
      source: 'local',
      environment: env,
    }
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
    // Fall back to local if Hub fails and fallback is enabled
    if (config.fallbackToLocal) {
      console.warn(`[Prompt Hub] Failed to load ${promptId} from Hub, using local fallback:`, error)

      const localPrompt = LOCAL_PROMPTS[promptId]

      if (!localPrompt) {
        console.warn(`[Prompt Hub] Local prompt "${promptId}" not found, using generic fallback`)
        return {
          prompt: ChatPromptTemplate.fromTemplate(
            'You are a helpful AI assistant. Context: {context} Request: {input}'
          ),
          source: 'local',
          environment: env,
        }
      }

      return {
        prompt: ChatPromptTemplate.fromTemplate(localPrompt),
        source: 'local',
        environment: env,
      }
    }

    throw error
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
    if (config.fallbackToLocal) {
      console.warn(`[Prompt Hub] Failed to load ${promptId}@${version}, using local:`, error)

      const localPrompt = LOCAL_PROMPTS[promptId]

      if (!localPrompt) {
        console.warn(`[Prompt Hub] Local prompt "${promptId}" not found, using generic fallback`)
        return {
          prompt: ChatPromptTemplate.fromTemplate(
            'You are a helpful AI assistant. Context: {context} Request: {input}'
          ),
          source: 'local',
          version,
          environment: config.environment,
        }
      }

      return {
        prompt: ChatPromptTemplate.fromTemplate(localPrompt),
        source: 'local',
        version,
        environment: config.environment,
      }
    }

    throw error
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
