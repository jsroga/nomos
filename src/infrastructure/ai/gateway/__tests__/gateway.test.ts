/**
 * AI Gateway Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AIGateway, resetAIGateway, getAIGateway } from '../gateway'
import {
  AIProvider,
  AIGatewayRequest,
  AIGatewayResult,
  AIProviderConfig,
  AIErrorCode,
} from '../types'

// Mock provider for testing
class MockProvider implements AIProvider {
  id = 'mock'
  name = 'Mock Provider'
  description = 'Test provider'
  capabilities = [{ type: 'image' as const, models: ['mock-1'] }]

  shouldFail = false
  delay = 0
  callCount = 0

  supports(type: string): boolean {
    return type === 'image'
  }

  validateConfig(config: AIProviderConfig): boolean {
    return !!config.apiKey
  }

  async execute<T>(
    request: AIGatewayRequest,
    config: AIProviderConfig
  ): Promise<AIGatewayResult<T>> {
    this.callCount++

    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay))
    }

    if (this.shouldFail) {
      return {
        success: false,
        error: 'Mock failure',
        code: AIErrorCode.PROVIDER_UNAVAILABLE,
        provider: this.id,
        retryable: true,
      }
    }

    return {
      success: true,
      result: { url: 'mock://image.png' } as T,
      provider: this.name,
      providerId: this.id,
      latencyMs: this.delay,
    }
  }

  async healthCheck(): Promise<boolean> {
    return !this.shouldFail
  }
}

describe('AIGateway', () => {
  let gateway: AIGateway
  let mockProvider: MockProvider

  beforeEach(() => {
    resetAIGateway()
    gateway = new AIGateway()
    mockProvider = new MockProvider()
  })

  describe('Provider Registration', () => {
    it('should register a provider', () => {
      gateway.registerProvider(mockProvider)
      const providers = gateway.getProviders()
      expect(providers).toHaveLength(1)
      expect(providers[0].id).toBe('mock')
    })

    it('should unregister a provider', () => {
      gateway.registerProvider(mockProvider)
      const deleted = gateway.unregisterProvider('mock')
      expect(deleted).toBe(true)
      expect(gateway.getProviders()).toHaveLength(0)
    })

    it('should return providers for type', () => {
      gateway.registerProvider(mockProvider)
      const imageProviders = gateway.getProvidersForType('image')
      const textProviders = gateway.getProvidersForType('text')
      expect(imageProviders).toHaveLength(1)
      expect(textProviders).toHaveLength(0)
    })
  })

  describe('Request Execution', () => {
    it('should execute request successfully', async () => {
      gateway.registerProvider(mockProvider, { apiKey: 'test-key' })

      const result = await gateway.execute({
        type: 'image',
        prompt: 'test prompt',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.provider).toBe('Mock Provider')
      }
    })

    it('should fail when no provider available', async () => {
      const result = await gateway.execute({
        type: 'text', // No text provider registered
        prompt: 'test',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe(AIErrorCode.PROVIDER_UNAVAILABLE)
      }
    })

    it('should fail when config is invalid', async () => {
      gateway.registerProvider(mockProvider) // No API key

      const result = await gateway.execute({
        type: 'image',
        prompt: 'test',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('Provider Fallback', () => {
    it('should fallback to next provider on failure', async () => {
      const failingProvider = new MockProvider()
      failingProvider.id = 'failing'
      failingProvider.shouldFail = true

      const workingProvider = new MockProvider()
      workingProvider.id = 'working'

      gateway.registerProvider(failingProvider, { apiKey: 'key1' })
      gateway.registerProvider(workingProvider, { apiKey: 'key2' })

      const result = await gateway.execute({
        type: 'image',
        prompt: 'test',
        preferredProvider: 'failing',
        fallbackProviders: ['working'],
        retryCount: 1,
      })

      expect(result.success).toBe(true)
      expect(failingProvider.callCount).toBe(1)
      expect(workingProvider.callCount).toBe(1)
    })
  })

  describe('Metrics', () => {
    it('should track request metrics', async () => {
      gateway.registerProvider(mockProvider, { apiKey: 'key' })

      await gateway.execute({ type: 'image', prompt: 'test1' })
      await gateway.execute({ type: 'image', prompt: 'test2' })

      const metrics = gateway.getMetrics('mock')
      expect(metrics).toHaveLength(1)
      expect(metrics[0].requestCount).toBe(2)
      expect(metrics[0].successCount).toBe(2)
    })

    it('should track failures', async () => {
      mockProvider.shouldFail = true
      gateway.registerProvider(mockProvider, { apiKey: 'key' })

      await gateway.execute({ type: 'image', prompt: 'test' })

      const metrics = gateway.getMetrics('mock')
      expect(metrics[0].errorCount).toBe(1)
    })
  })

  describe('A/B Testing', () => {
    it('should bucket users consistently', async () => {
      const provider1 = new MockProvider()
      provider1.id = 'provider1'
      const provider2 = new MockProvider()
      provider2.id = 'provider2'

      gateway.registerProvider(provider1, { apiKey: 'key' })
      gateway.registerProvider(provider2, { apiKey: 'key' })

      gateway.registerABTest({
        id: 'test-1',
        name: 'Test',
        variants: [
          { provider: 'provider1', weight: 0.5 },
          { provider: 'provider2', weight: 0.5 },
        ],
        active: true,
      })

      // Same bucket should get same provider
      const result1 = await gateway.execute({
        type: 'image',
        prompt: 'test',
        abTestBucket: 'user-123',
      })
      const result2 = await gateway.execute({
        type: 'image',
        prompt: 'test',
        abTestBucket: 'user-123',
      })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      if (result1.success && result2.success) {
        expect(result1.providerId).toBe(result2.providerId)
      }
    })
  })

  describe('Singleton', () => {
    it('should return same instance', () => {
      const g1 = getAIGateway()
      const g2 = getAIGateway()
      expect(g1).toBe(g2)
    })

    it('should reset instance', () => {
      const g1 = getAIGateway()
      resetAIGateway()
      const g2 = getAIGateway()
      expect(g1).not.toBe(g2)
    })
  })
})
