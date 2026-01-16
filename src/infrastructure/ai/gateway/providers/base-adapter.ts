/**
 * Base Provider Adapter
 *
 * Common functionality for all AI provider adapters
 */

import {
  AIProvider,
  AIProviderCapability,
  AIProviderConfig,
  AIGatewayRequest,
  AIGatewayResult,
  AIRequestType,
  AIErrorCode,
} from '../types'

export abstract class BaseProviderAdapter implements AIProvider {
  abstract id: string
  abstract name: string
  abstract description: string
  abstract capabilities: AIProviderCapability[]

  /**
   * Check if provider supports a request type
   */
  supports(type: AIRequestType): boolean {
    return this.capabilities.some(cap => cap.type === type)
  }

  /**
   * Validate configuration - default implementation checks for API key
   */
  validateConfig(config: AIProviderConfig): boolean {
    return !!config.apiKey
  }

  /**
   * Execute a request - must be implemented by each adapter
   */
  abstract execute<T>(
    request: AIGatewayRequest,
    config: AIProviderConfig
  ): Promise<AIGatewayResult<T>>

  /**
   * Health check - default implementation returns true
   */
  async healthCheck(): Promise<boolean> {
    return true
  }

  /**
   * Helper to create success response
   */
  protected success<T>(
    result: T,
    latencyMs: number,
    metadata?: Record<string, unknown>
  ): AIGatewayResult<T> {
    return {
      success: true,
      result,
      provider: this.name,
      providerId: this.id,
      latencyMs,
      metadata,
    }
  }

  /**
   * Helper to create error response
   */
  protected error(
    message: string,
    code: AIErrorCode = AIErrorCode.UNKNOWN,
    retryable = false,
    details?: unknown
  ): AIGatewayResult<never> {
    return {
      success: false,
      error: message,
      code,
      provider: this.id,
      retryable,
      details,
    }
  }

  /**
   * Map HTTP status to error code
   */
  protected mapHttpError(status: number): AIErrorCode {
    switch (status) {
      case 401:
      case 403:
        return AIErrorCode.AUTHENTICATION_FAILED
      case 429:
        return AIErrorCode.RATE_LIMITED
      case 400:
        return AIErrorCode.INVALID_REQUEST
      case 451:
        return AIErrorCode.CONTENT_FILTERED
      case 503:
      case 502:
      case 504:
        return AIErrorCode.PROVIDER_UNAVAILABLE
      default:
        return AIErrorCode.UNKNOWN
    }
  }

  /**
   * Check if HTTP error is retryable
   */
  protected isHttpRetryable(status: number): boolean {
    return [429, 502, 503, 504].includes(status)
  }
}
