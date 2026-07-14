/**
 * Storyteller Central Configuration
 *
 * Single source of truth for all storyteller module settings.
 * Manages prompts, guardrails, evaluation thresholds, and feature flags.
 *
 * Configuration can be overridden via:
 * 1. Environment variables
 * 2. Langfuse remote prompts (ENABLE_REMOTE_PROMPTS)
 * 3. Runtime configuration
 */

import { deepMerge } from '@/shared/data/deep-merge'
import {
  EnvFlagValue,
  GuardrailSeverity,
  STORYTELLER_PROMPT_ENVIRONMENTS,
  StorytellerPromptEnvironment,
  StorytellerPromptHubOwner,
} from './constants/storyteller-config-defaults'

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
  useHub: boolean // Pull prompts from Langfuse when ENABLE_REMOTE_PROMPTS=true
  hubOwner: string // Legacy LangSmith Hub org (unused; kept for config compat)
  environment: 'production' | 'staging' | 'dev'
  fallbackToLocal: boolean // Use local prompts if remote fetch fails
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
    hitlEnabled: process.env.STORYTELLER_HITL_ENABLED !== EnvFlagValue.False,
    ragEnabled: true,
    streamingEnabled: true,
    tracingEnabled: process.env.LANGCHAIN_TRACING_V2 === EnvFlagValue.True,
  },

  guardrails: {
    globalEnabled: process.env.STORYTELLER_GUARDRAILS_ENABLED !== EnvFlagValue.False,

    antiSlop: {
      enabled: true,
      severity: GuardrailSeverity.Warning,
      threshold: 60,
      blockOnCritical: true,
      minContentLength: 100,
    },

    hallucination: {
      enabled: true,
      severity: GuardrailSeverity.Error,
      validateUrls: true,
      maxRetriesOnFailure: 2,
    },

    consistency: {
      enabled: true,
      severity: GuardrailSeverity.Warning,
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
    useHub: process.env.STORYTELLER_USE_PROMPT_HUB !== EnvFlagValue.False,
    hubOwner: process.env.LANGSMITH_HUB_OWNER || StorytellerPromptHubOwner.Tilemap,
    environment:
      STORYTELLER_PROMPT_ENVIRONMENTS.find(
        env => env === process.env.STORYTELLER_PROMPT_ENV
      ) ?? StorytellerPromptEnvironment.Dev,
    fallbackToLocal: false,
  },

  performance: {
    maxConcurrentAgents: 4,
    timeoutMs: 60000,
    maxRetries: 3,
  },

  debug: {
    verboseLogging: process.env.STORYTELLER_VERBOSE === EnvFlagValue.True,
    logAgentDecisions: process.env.STORYTELLER_LOG_DECISIONS === EnvFlagValue.True,
    logRAGQueries: process.env.STORYTELLER_LOG_RAG === EnvFlagValue.True,
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
  return deepMerge<StorytellerConfig>(DEFAULT_CONFIG, runtimeConfig)
}

/**
 * Get required minimum entity links for world description / roadmap.
 * Used by agent prompt and update_world_bible tool. Change to 5-6 via env:
 * STORYTELLER_MIN_ITEM_LINKS=5 STORYTELLER_MIN_EVENT_LINKS=5 STORYTELLER_MIN_RULE_LINKS=5
 */
export function getEntityLinkRequirements(): EntityLinkRequirements {
  return getStorytellerConfig().entityLinks
}

// ============================================
// PROMPT IDENTIFIERS
// ============================================

/**
 * Prompt identifiers for Langfuse / local registry names.
 * Push via: npm run prompts:push[:staging|:prod]
 */
export { PROMPT_IDS } from './constants/storyteller-config-defaults'

// ============================================
// ENVIRONMENT VARIABLE KEYS
// ============================================
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
