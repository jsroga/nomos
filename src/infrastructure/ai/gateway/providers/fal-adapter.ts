/**
 * FAL AI Adapter for AI Gateway
 *
 * Wraps the existing fal.ts module for image segmentation
 */

import { BaseProviderAdapter } from './base-adapter'
import {
  AIProviderCapability,
  AIProviderConfig,
  AIGatewayRequest,
  AIGatewayResult,
  AIErrorCode,
} from '../types'
import { FalClient } from '../../fal'

// Custom result type for segmentation
export interface SegmentationResult {
  masks: unknown[]
  scores?: number[]
  boxes?: unknown[]
}

export class FalAdapter extends BaseProviderAdapter {
  id = 'fal'
  name = 'FAL AI'
  description = 'SAM-3 for object segmentation from images'

  capabilities: AIProviderCapability[] = [
    {
      type: 'image', // Using 'image' type for segmentation
      models: ['sam-3'],
      supportsStreaming: false,
    },
  ]

  private getClient(apiKey: string): FalClient {
    return new FalClient(apiKey)
  }

  async execute<T>(
    request: AIGatewayRequest,
    config: AIProviderConfig
  ): Promise<AIGatewayResult<T>> {
    const startTime = Date.now()

    if (!config.apiKey) {
      return this.error('FAL API key required', AIErrorCode.AUTHENTICATION_FAILED, false)
    }

    const client = this.getClient(config.apiKey)
    const options = request.options as
      | {
          imageDataUri: string
          box: { x1: number; y1: number; x2: number; y2: number }
          textPrompt?: string
        }
      | undefined

    if (!options?.imageDataUri || !options?.box) {
      return this.error(
        'FAL requires imageDataUri and box in options',
        AIErrorCode.INVALID_REQUEST,
        false
      )
    }

    try {
      const result = await client.segmentObject(
        options.imageDataUri,
        options.box,
        options.textPrompt || request.prompt
      )

      return this.success(result as T, Date.now() - startTime, {
        model: 'sam-3',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      let code = AIErrorCode.UNKNOWN
      let retryable = false

      if (message.includes('401') || message.includes('403')) {
        code = AIErrorCode.AUTHENTICATION_FAILED
      } else if (message.includes('429')) {
        code = AIErrorCode.RATE_LIMITED
        retryable = true
      }

      return this.error(message, code, retryable, error)
    }
  }

  async healthCheck(): Promise<boolean> {
    return true
  }
}

export const falAdapter = new FalAdapter()
