/**
 * Storyteller Central Configuration
 *
 * Single source of truth for all storyteller module settings.
 * Manages prompts, guardrails, evaluation thresholds, and feature flags.
 *
 * Configuration can be overridden via:
 * 1. Environment variables
 * 2. LangSmith Prompt Hub (for prompts)
 * 3. Runtime configuration
 */

// ============================================
// TYPES
// ============================================

export interface GuardrailConfig {
  enabled: boolean
  severity: 'error' | 'warning' | 'info'
}

export interface AntiSlopConfig extends GuardrailConfig {
  threshold: number // Score below this triggers warning (0-100)
  blockOnCritical: boolean // Block output if score < 30
  minContentLength: number // Skip validation for short content
}

export interface HallucinationConfig extends GuardrailConfig {
  validateUrls: boolean
  maxRetriesOnFailure: number
}

export interface ConsistencyConfig extends GuardrailConfig {
  checkSeriesBible: boolean
  checkCharacterVoice: boolean
  checkPlotContinuity: boolean
}

export interface EvaluationConfig {
  passThreshold: number // Minimum score to pass (0-1)
  magicScoreTarget: number // Target magic score (0-100)
  maxRegressionDelta: number // Max allowed score drop (0-1)
  sampleRateForLLM: number // Sample rate for expensive LLM evaluators
}

export interface PromptConfig {
  useHub: boolean // Pull prompts from LangSmith Hub
  hubOwner: string // LangSmith Hub organization
  environment: 'production' | 'staging' | 'dev'
  fallbackToLocal: boolean // Use local prompts if Hub fails
}

/** Minimum entity links required in world description / roadmap / episode description. Easy to set to 5-6 via env. */
export interface EntityLinkRequirements {
  minItems: number
  minEvents: number
  minRules: number
}

export interface StorytellerConfig {
  /** Minimum [Name][item-id], [Name][event-id], [Name][rule-id] in world description & roadmap. Default 3; set STORYTELLER_MIN_*_LINKS=5 or 6 for more. */
  entityLinks: EntityLinkRequirements

  // Feature flags
  features: {
    hitlEnabled: boolean // Human-in-the-loop confirmation
    ragEnabled: boolean
    streamingEnabled: boolean
    tracingEnabled: boolean
  }

  // Guardrail settings
  guardrails: {
    antiSlop: AntiSlopConfig
    hallucination: HallucinationConfig
    consistency: ConsistencyConfig
    globalEnabled: boolean // Master switch for all guardrails
  }

  // Evaluation settings
  evaluation: EvaluationConfig

  // Prompt management
  prompts: PromptConfig

  // Performance settings
  performance: {
    maxConcurrentAgents: number
    timeoutMs: number
    maxRetries: number
  }

  // Logging & debugging
  debug: {
    verboseLogging: boolean
    logAgentDecisions: boolean
    logRAGQueries: boolean
  }
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: StorytellerConfig = {
  entityLinks: {
    minItems: parseInt(process.env.STORYTELLER_MIN_ITEM_LINKS || '3', 10) || 3,
    minEvents: parseInt(process.env.STORYTELLER_MIN_EVENT_LINKS || '3', 10) || 3,
    minRules: parseInt(process.env.STORYTELLER_MIN_RULE_LINKS || '3', 10) || 3,
  },

  features: {
    hitlEnabled: process.env.STORYTELLER_HITL_ENABLED !== 'false',
    ragEnabled: true,
    streamingEnabled: true,
    tracingEnabled: process.env.LANGCHAIN_TRACING_V2 === 'true',
  },

  guardrails: {
    globalEnabled: process.env.STORYTELLER_GUARDRAILS_ENABLED !== 'false',

    antiSlop: {
      enabled: true,
      severity: 'warning',
      threshold: 60, // Score < 60 triggers warning (raised for higher quality bar)
      blockOnCritical: true, // Block output if score indicates AI slop
      minContentLength: 100,
    },

    hallucination: {
      enabled: true,
      severity: 'error',
      validateUrls: true,
      maxRetriesOnFailure: 2,
    },

    consistency: {
      enabled: true,
      severity: 'warning',
      checkSeriesBible: true,
      checkCharacterVoice: true,
      checkPlotContinuity: true,
    },
  },

  evaluation: {
    passThreshold: 0.5,
    magicScoreTarget: 60,
    maxRegressionDelta: 0.1, // 10% max allowed drop
    sampleRateForLLM: 0.3, // LLM-evaluate 30% of examples
  },

  prompts: {
    useHub: process.env.STORYTELLER_USE_PROMPT_HUB !== 'false', // Default to TRUE
    hubOwner: process.env.LANGSMITH_HUB_OWNER || 'tilemap',
    environment: (process.env.STORYTELLER_PROMPT_ENV as 'production' | 'staging' | 'dev') || 'dev', // Default to dev, safer than production
    fallbackToLocal: false, // Strict mode by default
  },

  performance: {
    maxConcurrentAgents: 4,
    timeoutMs: 60000,
    maxRetries: 3,
  },

  debug: {
    verboseLogging: process.env.STORYTELLER_VERBOSE === 'true',
    logAgentDecisions: process.env.STORYTELLER_LOG_DECISIONS === 'true',
    logRAGQueries: process.env.STORYTELLER_LOG_RAG === 'true',
  },
}

// ============================================
// RUNTIME CONFIG (mutable)
// ============================================

let runtimeConfig: Partial<StorytellerConfig> = {}

/**
 * Get the current storyteller configuration
 * Merges default config with runtime overrides
 */
export function getStorytellerConfig(): StorytellerConfig {
  return deepMerge(DEFAULT_CONFIG, runtimeConfig) as StorytellerConfig
}

/**
 * Update runtime configuration
 * Changes persist until process restart
 */
function updateStorytellerConfig(updates: Partial<StorytellerConfig>): void {
  runtimeConfig = deepMerge(runtimeConfig, updates) as Partial<StorytellerConfig>
  console.log('[Storyteller Config] Configuration updated')
}

/**
 * Reset to default configuration
 */
function resetStorytellerConfig(): void {
  runtimeConfig = {}
  console.log('[Storyteller Config] Reset to defaults')
}

// ============================================
// SPECIFIC CONFIG GETTERS
// ============================================

/**
 * Check if a specific guardrail is enabled
 */
function isGuardrailEnabled(guardrail: 'antiSlop' | 'hallucination' | 'consistency'): boolean {
  const config = getStorytellerConfig()
  return config.guardrails.globalEnabled && config.guardrails[guardrail].enabled
}

/**
 * Get anti-slop configuration
 */
function getAntiSlopConfig(): AntiSlopConfig {
  return getStorytellerConfig().guardrails.antiSlop
}

/**
 * Get required minimum entity links for world description / roadmap.
 * Used by agent prompt and update_world_bible tool. Change to 5-6 via env:
 * STORYTELLER_MIN_ITEM_LINKS=5 STORYTELLER_MIN_EVENT_LINKS=5 STORYTELLER_MIN_RULE_LINKS=5
 */
export function getEntityLinkRequirements(): EntityLinkRequirements {
  return getStorytellerConfig().entityLinks
}

/**
 * Get prompt hub configuration
 */
export function getPromptConfig(): PromptConfig {
  return getStorytellerConfig().prompts
}

/**
 * Get evaluation configuration
 */
function getEvaluationConfig(): EvaluationConfig {
  return getStorytellerConfig().evaluation
}

// ============================================
// PROMPT IDENTIFIERS
// ============================================

/**
 * Prompt identifiers for LangSmith Hub
 */
export const PROMPT_IDS = {
  // Main Agent Prompts
  supervisor: 'storyteller-supervisor',
  plotArchitect: 'storyteller-plot-architect',
  writer: 'storyteller-writer',
  premiseArchitect: 'storyteller-premise-architect',
  characterPsychology: 'storyteller-character-psychology',
  devilsAdvocate: 'storyteller-devils-advocate',
  scriptEditor: 'storyteller-script-editor',
  consequenceTracker: 'storyteller-consequence-tracker',
  episodePremiseArchitect: 'storyteller-episode-premise-architect',
  planner: 'storyteller-planner',
  magicAgent: 'storyteller-magic-agent',
  worldSimulator: 'storyteller-world-simulator',
  visualMoment: 'storyteller-visual-moment',

  // Section-Specific Prompts (Premise Architect)
  sectionWorldDescription: 'storyteller-section-world-description',
  sectionWorldRules: 'storyteller-section-world-rules',
  sectionFactions: 'storyteller-section-factions',
  sectionInspirations: 'storyteller-section-inspirations',
  sectionPlotTwists: 'storyteller-section-plot-twists',
  sectionEpisodeRoadmap: 'storyteller-section-episode-roadmap',
  sectionKeyCharacters: 'storyteller-section-key-characters',
  sectionSoundtracks: 'storyteller-section-soundtracks',
} as const

/**
 * Get full Hub path for a prompt
 */
function getPromptHubPath(
  promptId: keyof typeof PROMPT_IDS,
  environment?: 'production' | 'staging' | 'dev'
): string {
  const config = getPromptConfig()
  const env = environment || config.environment
  return `${config.hubOwner}/${PROMPT_IDS[promptId]}:${env}`
}

// ============================================
// ENVIRONMENT VARIABLE KEYS
// ============================================

/**
 * Environment variable names for documentation
 */
const ENV_VARS = {
  // Entity link minimums (world description & roadmap). Default 3; set to 5 or 6 for richer linking.
  STORYTELLER_MIN_ITEM_LINKS: 'Minimum [Name][item-id] in world description (default 3)',
  STORYTELLER_MIN_EVENT_LINKS: 'Minimum [Name][event-id] in world description (default 3)',
  STORYTELLER_MIN_RULE_LINKS: 'Minimum [Name][rule-id] in world description (default 3)',

  // Feature flags
  STORYTELLER_HITL_ENABLED: 'Enable human-in-the-loop confirmation',
  STORYTELLER_GUARDRAILS_ENABLED: 'Enable all guardrails (master switch)',
  STORYTELLER_FORCE_CLAUDE: 'Force Claude Opus 4.5 for all storyteller operations',

  // Prompt Hub
  STORYTELLER_USE_PROMPT_HUB: 'Pull prompts from LangSmith Hub',
  STORYTELLER_PROMPT_ENV: 'Prompt environment (production/staging/dev)',
  LANGSMITH_HUB_OWNER: 'LangSmith Hub organization name',

  // Debugging
  STORYTELLER_VERBOSE: 'Enable verbose logging',
  STORYTELLER_LOG_DECISIONS: 'Log agent decisions',
  STORYTELLER_LOG_RAG: 'Log RAG queries',

  // LangSmith
  LANGCHAIN_API_KEY: 'LangSmith API key',
  LANGCHAIN_TRACING_V2: 'Enable LangSmith tracing',
  LANGCHAIN_PROJECT: 'LangSmith project name',

  // Model Configuration
  ANTHROPIC_API_KEY: 'Anthropic API key for Claude Opus 4.5',
} as const

// ============================================
// HELPERS
// ============================================

/**
 * Deep merge two objects
 */
function deepMerge(target: any, source: any): any {
  if (!source) return target

  const result = { ...target }

  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key])
    } else if (source[key] !== undefined) {
      result[key] = source[key]
    }
  }

  return result
}

// ============================================
// EXPORT SINGLETON
// ============================================

/**
 * Default export for easy access
 */
export const STORYTELLER_CONFIG = getStorytellerConfig()

/**
 * Type-safe config for static imports
 * Note: This is a snapshot at import time, use getStorytellerConfig() for runtime values
 */
