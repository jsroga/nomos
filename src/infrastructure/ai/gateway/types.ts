/**
 * AI Gateway - Unified Interface for AI Providers
 *
 * This module provides a single abstraction over multiple AI service providers,
 * enabling provider swapping, A/B testing, and automatic fallback.
 */

import { z } from 'zod'

// =============================================================================
// REQUEST TYPES
// =============================================================================

export type AIRequestType = 'image' | 'text' | '3d' | 'video' | 'embedding' | 'audio'

export const AIGatewayRequestSchema = z.object({
  type: z.enum(['image', 'text', '3d', 'video', 'embedding', 'audio']),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  options: z.record(z.unknown()).optional(),
  preferredProvider: z.string().optional(),
  fallbackProviders: z.array(z.string()).optional(),
  abTestBucket: z.string().optional(),
  timeout: z.number().optional().default(30000),
  retryCount: z.number().optional().default(3),
})

export type AIGatewayRequest = z.infer<typeof AIGatewayRequestSchema>

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface AIGatewayResponse<T = unknown> {
  success: true
  result: T
  provider: string
  providerId: string
  latencyMs: number
  cost?: number
  metadata?: {
    model?: string
    version?: string
    requestId?: string
    [key: string]: unknown
  }
}

export interface AIGatewayError {
  success: false
  error: string
  code: AIErrorCode
  provider?: string
  retryable: boolean
  details?: unknown
}

export type AIGatewayResult<T = unknown> = AIGatewayResponse<T> | AIGatewayError

// =============================================================================
// ERROR CODES
// =============================================================================

export enum AIErrorCode {
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  TIMEOUT = 'TIMEOUT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  UNKNOWN = 'UNKNOWN',
}

// =============================================================================
// PROVIDER INTERFACE
// =============================================================================

export interface AIProviderCapability {
  type: AIRequestType
  models: string[]
  maxInputTokens?: number
  maxOutputTokens?: number
  supportsStreaming?: boolean
}

export interface AIProviderConfig {
  apiKey?: string
  baseUrl?: string
  timeout?: number
  [key: string]: unknown
}

export interface AIProvider {
  /** Unique identifier for this provider */
  id: string

  /** Human-readable name */
  name: string

  /** Provider description */
  description: string

  /** Supported capabilities */
  capabilities: AIProviderCapability[]

  /** Check if provider supports a request type */
  supports(type: AIRequestType): boolean

  /** Validate configuration */
  validateConfig(config: AIProviderConfig): boolean

  /** Execute a request */
  execute<T>(request: AIGatewayRequest, config: AIProviderConfig): Promise<AIGatewayResult<T>>

  /** Health check */
  healthCheck(): Promise<boolean>

  /** Estimate cost for a request */
  estimateCost?(request: AIGatewayRequest): number
}

// =============================================================================
// IMAGE GENERATION TYPES
// =============================================================================
// =============================================================================
// 3D GENERATION TYPES
// =============================================================================
// =============================================================================
// TEXT GENERATION TYPES
// =============================================================================
// =============================================================================
// A/B TESTING TYPES
// =============================================================================

export interface ABTestConfig {
  id: string
  name: string
  variants: {
    provider: string
    weight: number
    config?: AIProviderConfig
  }[]
  startDate?: Date
  endDate?: Date
  active: boolean
}

export interface ABTestResult {
  testId: string
  variant: string
  provider: string
  success: boolean
  latencyMs: number
  cost?: number
}

// =============================================================================
// METRICS TYPES
// =============================================================================

export interface ProviderMetrics {
  providerId: string
  requestCount: number
  successCount: number
  errorCount: number
  avgLatencyMs: number
  p95LatencyMs: number
  totalCost: number
  lastError?: {
    code: AIErrorCode
    timestamp: Date
    message: string
  }
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isAIGatewayError(result: AIGatewayResult): result is AIGatewayError {
  return result.success === false
}
