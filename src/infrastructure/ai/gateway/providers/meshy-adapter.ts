/**
 * Meshy AI Adapter for AI Gateway
 *
 * Wraps the existing meshy.ts module for 3D model generation
 */

import { BaseProviderAdapter } from './base-adapter'
import {
  AIProviderCapability,
  AIProviderConfig,
  AIGatewayRequest,
  AIGatewayResult,
  AIErrorCode,
  ThreeDGenerationResult,
  ThreeDGenerationOptions,
} from '../types'
import { MeshyClient } from '../../meshy'

export class MeshyAdapter extends BaseProviderAdapter {
  id = 'meshy'
  name = 'Meshy AI'
  description = '3D model generation from images with PBR texturing'

  capabilities: AIProviderCapability[] = [
    {
      type: '3d',
      models: ['meshy-4', 'meshy-5', 'latest'],
      supportsStreaming: false,
    },
  ]

  private getClient(apiKey: string): MeshyClient {
    return new MeshyClient(apiKey)
  }

  async execute<T>(
    request: AIGatewayRequest,
    config: AIProviderConfig
  ): Promise<AIGatewayResult<T>> {
    const startTime = Date.now()

    if (request.type !== '3d') {
      return this.error(
        `Meshy does not support request type: ${request.type}`,
        AIErrorCode.INVALID_REQUEST,
        false
      )
    }

    if (!config.apiKey) {
      return this.error('Meshy API key required', AIErrorCode.AUTHENTICATION_FAILED, false)
    }

    const client = this.getClient(config.apiKey)
    const options = request.options as (ThreeDGenerationOptions & { imageUrl?: string }) | undefined

    try {
      let modelUrl: string

      if (options?.imageUrl) {
        // Image to 3D
        modelUrl = await client.generateModel(options.imageUrl)
      } else {
        // Text to 3D would require a different API - for now error
        return this.error(
          'Meshy requires an imageUrl in options for 3D generation',
          AIErrorCode.INVALID_REQUEST,
          false
        )
      }

      const result: ThreeDGenerationResult = {
        modelUrl,
        format: options?.format || 'glb',
        textured: true,
      }

      return this.success(result as T, Date.now() - startTime, {
        model: 'meshy-image-to-3d',
        taskId: client.currentTaskId,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      let code = AIErrorCode.UNKNOWN
      let retryable = false

      if (message.includes('Timed Out')) {
        code = AIErrorCode.TIMEOUT
        retryable = true
      } else if (message.includes('Failed')) {
        code = AIErrorCode.PROVIDER_UNAVAILABLE
      }

      return this.error(message, code, retryable, error)
    }
  }

  /**
   * Retexture an existing 3D model
   */
  async retexture(
    modelUrl: string,
    prompt: string,
    config: AIProviderConfig,
    aiModel: 'latest' | 'meshy-4' | 'meshy-5' = 'latest',
    styleImageUrl?: string
  ): Promise<string> {
    if (!config.apiKey) throw new Error('Meshy API key required')
    const client = this.getClient(config.apiKey)
    return client.retextureModel(modelUrl, prompt, aiModel, styleImageUrl)
  }

  async healthCheck(): Promise<boolean> {
    return true
  }
}

export const meshyAdapter = new MeshyAdapter()
