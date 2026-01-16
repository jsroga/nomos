/**
 * Replicate Adapter for AI Gateway
 *
 * Wraps the existing replicate.ts module for image segmentation and texture generation
 */

import { BaseProviderAdapter } from './base-adapter'
import {
  AIProviderCapability,
  AIProviderConfig,
  AIGatewayRequest,
  AIGatewayResult,
  AIErrorCode,
  ImageGenerationResult,
} from '../types'
import { ReplicateClient } from '../../replicate'

export class ReplicateAdapter extends BaseProviderAdapter {
  id = 'replicate'
  name = 'Replicate'
  description = 'SAM-2 for segmentation, SDXL for texture generation'

  capabilities: AIProviderCapability[] = [
    {
      type: 'image',
      models: ['sam-2', 'sdxl'],
      supportsStreaming: false,
    },
  ]

  private getClient(apiKey: string): ReplicateClient {
    return new ReplicateClient(apiKey)
  }

  async execute<T>(
    request: AIGatewayRequest,
    config: AIProviderConfig
  ): Promise<AIGatewayResult<T>> {
    const startTime = Date.now()

    if (!config.apiKey) {
      return this.error('Replicate API key required', AIErrorCode.AUTHENTICATION_FAILED, false)
    }

    const client = this.getClient(config.apiKey)
    const options = request.options as
      | {
          mode?: 'segment' | 'texture'
          image?: string
          points?: Array<{ x: number; y: number; label: number }>
        }
      | undefined

    try {
      // Determine operation mode
      const mode = options?.mode || 'texture'

      if (mode === 'segment') {
        // Segmentation with SAM-2
        if (!options?.image) {
          return this.error('Image required for segmentation', AIErrorCode.INVALID_REQUEST, false)
        }

        const result = await client.segmentObject(options.image, options.points || [])
        return this.success(result as T, Date.now() - startTime, { model: 'sam-2' })
      } else {
        // Texture generation with SDXL
        const url = await client.generateTexture(request.prompt)

        const result: ImageGenerationResult = {
          url,
          width: 1024,
          height: 1024,
          format: 'png',
        }

        return this.success(result as T, Date.now() - startTime, { model: 'sdxl' })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      let code = AIErrorCode.UNKNOWN
      let retryable = false

      if (message.includes('401') || message.includes('auth')) {
        code = AIErrorCode.AUTHENTICATION_FAILED
      } else if (message.includes('rate') || message.includes('429')) {
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

export const replicateAdapter = new ReplicateAdapter()
