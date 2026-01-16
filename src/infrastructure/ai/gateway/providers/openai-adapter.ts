/**
 * OpenAI Adapter for AI Gateway
 *
 * Wraps the existing openai.ts module for DALL-E image generation
 */

import { BaseProviderAdapter } from './base-adapter'
import {
  AIProviderCapability,
  AIProviderConfig,
  AIGatewayRequest,
  AIGatewayResult,
  AIErrorCode,
  ImageGenerationResult,
  TextGenerationResult,
  ImageGenerationOptions,
  TextGenerationOptions,
} from '../types'
import OpenAI from 'openai'

export class OpenAIAdapter extends BaseProviderAdapter {
  id = 'openai'
  name = 'OpenAI'
  description = 'DALL-E for image generation, GPT for text generation'

  capabilities: AIProviderCapability[] = [
    {
      type: 'image',
      models: ['dall-e-2', 'dall-e-3'],
      supportsStreaming: false,
    },
    {
      type: 'text',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      supportsStreaming: true,
      maxOutputTokens: 16384,
    },
  ]

  private getClient(config: AIProviderConfig): OpenAI {
    return new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
      timeout: 60000,
      maxRetries: 2,
    })
  }

  async execute<T>(
    request: AIGatewayRequest,
    config: AIProviderConfig
  ): Promise<AIGatewayResult<T>> {
    const startTime = Date.now()

    if (!config.apiKey) {
      return this.error('OpenAI API key required', AIErrorCode.AUTHENTICATION_FAILED, false)
    }

    const client = this.getClient(config)

    try {
      if (request.type === 'image') {
        return await this.executeImageRequest<T>(client, request, startTime)
      } else if (request.type === 'text') {
        return await this.executeTextRequest<T>(client, request, startTime)
      } else {
        return this.error(
          `OpenAI does not support request type: ${request.type}`,
          AIErrorCode.INVALID_REQUEST,
          false
        )
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  private async executeImageRequest<T>(
    client: OpenAI,
    request: AIGatewayRequest,
    startTime: number
  ): Promise<AIGatewayResult<T>> {
    const options = request.options as ImageGenerationOptions | undefined

    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt: request.prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    })

    const b64 = response.data[0].b64_json
    if (!b64) {
      return this.error('No image generated', AIErrorCode.UNKNOWN, false)
    }

    const result: ImageGenerationResult = {
      url: `data:image/png;base64,${b64}`,
      width: options?.width || 1024,
      height: options?.height || 1024,
      format: 'png',
      revisedPrompt: response.data[0].revised_prompt,
    }

    return this.success(result as T, Date.now() - startTime, {
      model: 'dall-e-3',
    })
  }

  private async executeTextRequest<T>(
    client: OpenAI,
    request: AIGatewayRequest,
    startTime: number
  ): Promise<AIGatewayResult<T>> {
    const options = request.options as TextGenerationOptions | undefined

    const response = await client.chat.completions.create({
      model: options?.systemPrompt ? 'gpt-4o' : 'gpt-4o-mini',
      messages: [
        ...(options?.systemPrompt
          ? [{ role: 'system' as const, content: options.systemPrompt }]
          : []),
        { role: 'user' as const, content: request.prompt },
      ],
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature || 0.7,
    })

    const choice = response.choices[0]
    const result: TextGenerationResult = {
      text: choice.message.content || '',
      finishReason:
        choice.finish_reason === 'stop'
          ? 'stop'
          : choice.finish_reason === 'length'
            ? 'length'
            : 'content_filter',
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    }

    return this.success(result as T, Date.now() - startTime, {
      model: response.model,
    })
  }

  private handleError(error: unknown): AIGatewayResult<never> {
    const message = error instanceof Error ? error.message : 'Unknown error'

    let code = AIErrorCode.UNKNOWN
    let retryable = false

    if (message.includes('API key') || message.includes('401')) {
      code = AIErrorCode.AUTHENTICATION_FAILED
    } else if (message.includes('rate') || message.includes('429')) {
      code = AIErrorCode.RATE_LIMITED
      retryable = true
    } else if (message.includes('content_policy') || message.includes('safety')) {
      code = AIErrorCode.CONTENT_FILTERED
    } else if (message.includes('timeout')) {
      code = AIErrorCode.TIMEOUT
      retryable = true
    }

    return this.error(message, code, retryable, error)
  }

  async healthCheck(): Promise<boolean> {
    return true
  }
}

export const openaiAdapter = new OpenAIAdapter()
