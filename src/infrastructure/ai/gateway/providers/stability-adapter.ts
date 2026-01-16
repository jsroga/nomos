/**
 * Stability AI Adapter for AI Gateway
 *
 * Wraps the existing stability.ts module with the gateway interface
 */

import { BaseProviderAdapter } from './base-adapter'
import {
  AIProviderCapability,
  AIProviderConfig,
  AIGatewayRequest,
  AIGatewayResult,
  AIErrorCode,
  ImageGenerationResult,
  ImageGenerationOptions,
} from '../types'
import { StabilityAIModel } from '../../stability'

export class StabilityAdapter extends BaseProviderAdapter {
  id = 'stability'
  name = 'Stability AI'
  description = 'Stable Diffusion XL for high-quality image generation and inpainting'

  capabilities: AIProviderCapability[] = [
    {
      type: 'image',
      models: ['stable-diffusion-xl-1024-v1-0', 'stable-diffusion-v1-6'],
      supportsStreaming: false,
    },
  ]

  private model = new StabilityAIModel()

  async execute<T>(
    request: AIGatewayRequest,
    config: AIProviderConfig
  ): Promise<AIGatewayResult<T>> {
    const startTime = Date.now()

    if (request.type !== 'image') {
      return this.error(
        `Stability AI does not support request type: ${request.type}`,
        AIErrorCode.INVALID_REQUEST,
        false
      )
    }

    try {
      const options = request.options as ImageGenerationOptions | undefined

      // Map gateway config to legacy config
      const legacyConfig = {
        apiKey: config.apiKey,
        params: {
          steps: options?.steps || 30,
          cfgScale: options?.cfgScale || 7,
          sampler: options?.sampler,
        },
      }

      // Use text-to-image for simple requests
      const imageUrl = await this.model.textToImage(request.prompt, legacyConfig)

      const result: ImageGenerationResult = {
        url: imageUrl,
        width: options?.width || 1024,
        height: options?.height || 1024,
        format: 'png',
      }

      return this.success(result as T, Date.now() - startTime, {
        model: 'stable-diffusion-xl-1024-v1-0',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      // Try to determine error type from message
      let code = AIErrorCode.UNKNOWN
      let retryable = false

      if (message.includes('API Key')) {
        code = AIErrorCode.AUTHENTICATION_FAILED
      } else if (message.includes('rate') || message.includes('429')) {
        code = AIErrorCode.RATE_LIMITED
        retryable = true
      } else if (message.includes('timeout')) {
        code = AIErrorCode.TIMEOUT
        retryable = true
      }

      return this.error(message, code, retryable, error)
    }
  }

  /**
   * Enhanced upscale operation (not via standard gateway)
   */
  async upscale(
    base64Image: string,
    prompt: string,
    creativity: number,
    config: AIProviderConfig
  ): Promise<string> {
    // Store API key temporarily for the legacy model
    if (config.apiKey && typeof window !== 'undefined') {
      localStorage.setItem('stability-api-key', JSON.stringify({ apiKey: config.apiKey }))
    }
    return this.model.upscale(base64Image, prompt, creativity)
  }

  /**
   * 4K upscale operation
   */
  async upscale4k(
    base64Image: string,
    mode: 'creative' | 'conservative',
    config: AIProviderConfig
  ): Promise<string> {
    return this.model.upscale4k(base64Image, config.apiKey, mode)
  }

  async healthCheck(): Promise<boolean> {
    // Could add a lightweight API ping here
    return true
  }
}

export const stabilityAdapter = new StabilityAdapter()
