'use client'

import { useEffect, useState } from 'react'
import posthog from 'posthog-js'
import { experiments, type ExperimentConfig } from './config'

// Simple hash function for consistent user bucketing
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Get or create anonymous user ID
function getAnonymousId(): string {
  if (typeof window === 'undefined') return 'server'

  let id = localStorage.getItem('kur_anon_id')
  if (!id) {
    id = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('kur_anon_id', id)
  }
  return id
}

// Deterministically assign variant based on user ID
function assignVariant(experimentId: string, userId: string, config: ExperimentConfig): string {
  const hash = hashString(`${experimentId}_${userId}`)
  const normalizedHash = (hash % 100) / 100

  let cumulative = 0
  for (let i = 0; i < config.variants.length; i++) {
    cumulative += config.weights[i]
    if (normalizedHash < cumulative) {
      return config.variants[i]
    }
  }

  return config.variants[0] // Fallback to first variant
}

/**
 * Hook to get the assigned variant for an experiment
 * Returns the variant name and a loading state
 */
export function useExperiment(experimentId: string): {
  variant: string | null
  isLoading: boolean
} {
  const [variant, setVariant] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const config = experiments[experimentId]
    if (!config) {
      console.warn(`Experiment "${experimentId}" not found in config`)
      setVariant('control')
      setIsLoading(false)
      return
    }

    const userId = getAnonymousId()
    const assignedVariant = assignVariant(experimentId, userId, config)

    // Track experiment exposure in PostHog
    if (typeof window !== 'undefined' && posthog.__loaded) {
      posthog.capture('$experiment_started', {
        experiment_id: experimentId,
        variant: assignedVariant,
      })
    }

    setVariant(assignedVariant)
    setIsLoading(false)
  }, [experimentId])

  return { variant, isLoading }
}

/**
 * Track conversion event for an experiment
 */
export function trackConversion(
  experimentId: string,
  conversionType: string,
  properties?: Record<string, any>
) {
  if (typeof window === 'undefined') return

  posthog.capture('experiment_conversion', {
    experiment_id: experimentId,
    conversion_type: conversionType,
    ...properties,
  })
}

/**
 * Check if user is in a specific variant (useful for conditional rendering)
 */
export function useIsVariant(experimentId: string, variantName: string): boolean {
  const { variant } = useExperiment(experimentId)
  return variant === variantName
}
