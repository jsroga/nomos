/**
 * AI Gateway - Central Manager for AI Providers
 *
 * Provides:
 * - Unified interface for all AI operations
 * - Automatic provider fallback
 * - A/B testing support
 * - Metrics collection
 * - Rate limiting and retry logic
 */

import {
  AIGatewayRequest,
  AIGatewayResult,
  AIGatewayResponse,
  AIProvider,
  AIProviderConfig,
  AIErrorCode,
  AIRequestType,
  ABTestConfig,
  ABTestResult,
  ProviderMetrics,
  isAIGatewayError,
} from './types'

// =============================================================================
// GATEWAY CLASS
// =============================================================================

export class AIGateway {
  private providers: Map<string, AIProvider> = new Map()
  private configs: Map<string, AIProviderConfig> = new Map()
  private abTests: Map<string, ABTestConfig> = new Map()
  private metrics: Map<string, ProviderMetrics> = new Map()
  private abTestResults: ABTestResult[] = []

  // Default provider per request type
  private defaultProviders: Map<AIRequestType, string> = new Map()

  // =============================================================================
  // PROVIDER REGISTRATION
  // =============================================================================

  /**
   * Register a provider with the gateway
   */
  registerProvider(provider: AIProvider, config?: AIProviderConfig): void {
    this.providers.set(provider.id, provider)
    if (config) {
      this.configs.set(provider.id, config)
    }

    // Initialize metrics
    this.metrics.set(provider.id, {
      providerId: provider.id,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      totalCost: 0,
    })

    console.log(`[AIGateway] Registered provider: ${provider.name} (${provider.id})`)
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(providerId: string): boolean {
    const deleted = this.providers.delete(providerId)
    this.configs.delete(providerId)
    this.metrics.delete(providerId)
    return deleted
  }

  /**
   * Update provider configuration
   */
  updateConfig(providerId: string, config: AIProviderConfig): void {
    this.configs.set(providerId, { ...this.configs.get(providerId), ...config })
  }

  /**
   * Set default provider for a request type
   */
  setDefaultProvider(type: AIRequestType, providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider ${providerId} not registered`)
    }
    this.defaultProviders.set(type, providerId)
  }

  /**
   * Get all registered providers
   */
  getProviders(): AIProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * Get providers that support a specific request type
   */
  getProvidersForType(type: AIRequestType): AIProvider[] {
    return this.getProviders().filter(p => p.supports(type))
  }

  // =============================================================================
  // REQUEST EXECUTION
  // =============================================================================

  /**
   * Execute a request through the gateway
   */
  async execute<T>(request: AIGatewayRequest): Promise<AIGatewayResult<T>> {
    const startTime = Date.now()

    // Determine provider order
    const providerOrder = this.getProviderOrder(request)

    if (providerOrder.length === 0) {
      return {
        success: false,
        error: `No provider available for request type: ${request.type}`,
        code: AIErrorCode.PROVIDER_UNAVAILABLE,
        retryable: false,
      }
    }

    // Try providers in order
    let lastError: AIGatewayResult<T> | null = null

    for (const providerId of providerOrder) {
      const provider = this.providers.get(providerId)
      const config = this.configs.get(providerId) || {}

      if (!provider) continue

      // Validate config
      if (!provider.validateConfig(config)) {
        console.warn(`[AIGateway] Provider ${providerId} config invalid, skipping`)
        continue
      }

      try {
        const result = await this.executeWithRetry<T>(
          provider,
          request,
          config,
          request.retryCount || 3
        )

        if (result.success) {
          // Update metrics
          this.updateMetrics(
            providerId,
            true,
            Date.now() - startTime,
            result.cost
          )

          // Record A/B test result if applicable
          if (request.abTestBucket) {
            this.recordABTestResult(request.abTestBucket, providerId, true, Date.now() - startTime)
          }

          return result
        }

        lastError = result

        // Check if error is retryable with different provider
        if (!this.isRetryableWithFallback(result)) {
          return result
        }
      } catch (error) {
        console.error(`[AIGateway] Provider ${providerId} threw:`, error)
        lastError = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          code: AIErrorCode.UNKNOWN,
          provider: providerId,
          retryable: true,
        }
      }

      // Update metrics for failure
      this.updateMetrics(providerId, false, Date.now() - startTime)
    }

    // All providers failed
    return (
      lastError || {
        success: false,
        error: 'All providers failed',
        code: AIErrorCode.PROVIDER_UNAVAILABLE,
        retryable: false,
      }
    )
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry<T>(
    provider: AIProvider,
    request: AIGatewayRequest,
    config: AIProviderConfig,
    maxRetries: number
  ): Promise<AIGatewayResult<T>> {
    let lastResult: AIGatewayResult<T> | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await provider.execute<T>(request, config)

      if (result.success) {
        return result
      }

      lastResult = result

      // Check if error is retryable (must use type guard)
      if (isAIGatewayError(result) && !result.retryable) {
        return result
      }

      // Exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return lastResult!
  }

  // =============================================================================
  // PROVIDER SELECTION
  // =============================================================================

  /**
   * Determine provider order for a request
   */
  private getProviderOrder(request: AIGatewayRequest): string[] {
    const order: string[] = []

    // Check A/B test first
    if (request.abTestBucket) {
      const abProvider = this.getABTestProvider(request.abTestBucket, request.type)
      if (abProvider) {
        order.push(abProvider)
      }
    }

    // Preferred provider
    if (request.preferredProvider && !order.includes(request.preferredProvider)) {
      order.push(request.preferredProvider)
    }

    // Fallback providers
    if (request.fallbackProviders) {
      for (const providerId of request.fallbackProviders) {
        if (!order.includes(providerId)) {
          order.push(providerId)
        }
      }
    }

    // Default provider for request type
    const defaultProvider = this.defaultProviders.get(request.type)
    if (defaultProvider && !order.includes(defaultProvider)) {
      order.push(defaultProvider)
    }

    // All other capable providers
    for (const provider of this.getProvidersForType(request.type)) {
      if (!order.includes(provider.id)) {
        order.push(provider.id)
      }
    }

    return order
  }

  /**
   * Check if error allows fallback to different provider
   */
  private isRetryableWithFallback(result: AIGatewayResult<unknown>): boolean {
    if (result.success) return false

    // Use type guard to access error properties
    if (!isAIGatewayError(result)) return false

    // These errors should try another provider
    const fallbackErrors = [
      AIErrorCode.PROVIDER_UNAVAILABLE,
      AIErrorCode.RATE_LIMITED,
      AIErrorCode.TIMEOUT,
      AIErrorCode.QUOTA_EXCEEDED,
    ]

    return fallbackErrors.includes(result.code)
  }

  // =============================================================================
  // A/B TESTING
  // =============================================================================

  /**
   * Register an A/B test
   */
  registerABTest(test: ABTestConfig): void {
    this.abTests.set(test.id, test)
    console.log(`[AIGateway] Registered A/B test: ${test.name} (${test.id})`)
  }

  /**
   * Get provider for A/B test bucket
   */
  private getABTestProvider(bucket: string, type: AIRequestType): string | null {
    const tests = Array.from(this.abTests.values())
    for (const test of tests) {
      if (!test.active) continue
      if (test.startDate && new Date() < test.startDate) continue
      if (test.endDate && new Date() > test.endDate) continue

      // Simple hash-based bucketing
      const hash = this.hashBucket(bucket, test.id)
      let cumulative = 0

      for (const variant of test.variants) {
        cumulative += variant.weight
        if (hash < cumulative) {
          // Check if provider supports this type
          const provider = this.providers.get(variant.provider)
          if (provider?.supports(type)) {
            return variant.provider
          }
          break
        }
      }
    }

    return null
  }

  /**
   * Hash bucket ID to 0-1 range for variant selection
   */
  private hashBucket(bucket: string, testId: string): number {
    const combined = `${bucket}:${testId}`
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash) / 2147483647
  }

  /**
   * Record A/B test result for analysis
   */
  private recordABTestResult(
    testId: string,
    provider: string,
    success: boolean,
    latencyMs: number,
    cost?: number
  ): void {
    this.abTestResults.push({
      testId,
      variant: provider,
      provider,
      success,
      latencyMs,
      cost,
    })

    // Keep only last 10000 results
    if (this.abTestResults.length > 10000) {
      this.abTestResults.shift()
    }
  }

  /**
   * Get A/B test results for analysis
   */
  getABTestResults(testId?: string): ABTestResult[] {
    if (testId) {
      return this.abTestResults.filter(r => r.testId === testId)
    }
    return [...this.abTestResults]
  }

  // =============================================================================
  // METRICS
  // =============================================================================

  /**
   * Update provider metrics
   */
  private updateMetrics(
    providerId: string,
    success: boolean,
    latencyMs: number,
    cost?: number
  ): void {
    const metrics = this.metrics.get(providerId)
    if (!metrics) return

    metrics.requestCount++
    if (success) {
      metrics.successCount++
    } else {
      metrics.errorCount++
    }

    // Running average for latency
    metrics.avgLatencyMs =
      (metrics.avgLatencyMs * (metrics.requestCount - 1) + latencyMs) / metrics.requestCount

    // Simple approximation for p95
    if (latencyMs > metrics.p95LatencyMs) {
      metrics.p95LatencyMs = metrics.p95LatencyMs + (latencyMs - metrics.p95LatencyMs) * 0.05
    }

    if (cost) {
      metrics.totalCost += cost
    }
  }

  /**
   * Get metrics for a provider
   */
  getMetrics(providerId?: string): ProviderMetrics[] {
    if (providerId) {
      const metrics = this.metrics.get(providerId)
      return metrics ? [metrics] : []
    }
    return Array.from(this.metrics.values())
  }

  // =============================================================================
  // HEALTH CHECK
  // =============================================================================

  /**
   * Check health of all providers
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()

    await Promise.all(
      Array.from(this.providers.entries()).map(async ([id, provider]) => {
        try {
          const healthy = await provider.healthCheck()
          results.set(id, healthy)
        } catch {
          results.set(id, false)
        }
      })
    )

    return results
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let gatewayInstance: AIGateway | null = null

export function getAIGateway(): AIGateway {
  if (!gatewayInstance) {
    gatewayInstance = new AIGateway()
  }
  return gatewayInstance
}

export function resetAIGateway(): void {
  gatewayInstance = null
}

// Re-export types
export * from './types'
