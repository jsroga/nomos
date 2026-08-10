/**
 * Storyteller Central Configuration
 *
 * Single source of truth for all storyteller module settings.
 * Manages guardrails, evaluation thresholds, and feature flags.
 * Overridable via environment variables or `setStorytellerConfig` at runtime.
 */

import { deepMerge } from '@/shared/data/deep-merge'
import { EnvFlagValue, GuardrailSeverity } from './constants/storyteller-config-defaults'

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
    ragEnabled: boolean
    streamingEnabled: boolean
  }

  // Guardrail settings
  guardrails: {
    antiSlop: AntiSlopConfig
    hallucination: HallucinationConfig
    consistency: ConsistencyConfig
  }

  // Evaluation settings
  evaluation: EvaluationConfig

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
    ragEnabled: true,
    streamingEnabled: true,
  },

  guardrails: {
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
 * Prompt identifiers for the local / remote prompt registry.
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
