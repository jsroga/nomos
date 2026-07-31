import 'server-only'

import {
  ContentType,
  HttpAuthScheme,
  HttpMethod,
  OpenAiChatRole,
} from '@/shared/data/constants/protocol'
import {
  TEXT_GEN_FAST_MODEL,
  openRouterClientConfig,
} from '@/shared/agent-kernel/models'
import {
  TextureServiceError,
  TextureServiceLog,
  TextureServicePlaceholder,
} from '@/domains/interior-designer/constants/texture-service'
import { DEFAULT_TEXTURE_STYLE } from '@/domains/interior-designer/constants/texture-defaults'
import { TextureStyle, TEXTURE_STYLES, TEXTURE_REFINEMENT_SYSTEM_PROMPT } from '../prompts'

// Re-export TextureStyle for consumers
export type { TextureStyle }

class TextureService {
  async refinePrompt(basePrompt: string): Promise<string> {
    const { apiKey, baseURL } = openRouterClientConfig()
    if (!apiKey) {
      console.warn(TextureServiceLog.NoOpenRouterKey)
      return basePrompt
    }

    try {
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: HttpMethod.Post,
        headers: {
          'Content-Type': ContentType.Json,
          Authorization: `${HttpAuthScheme.Bearer}${apiKey}`,
        },
        body: JSON.stringify({
          model: TEXT_GEN_FAST_MODEL,
          messages: [
            {
              role: OpenAiChatRole.System,
              content: TEXTURE_REFINEMENT_SYSTEM_PROMPT,
            },
            { role: OpenAiChatRole.User, content: basePrompt },
          ],
          temperature: 0.7,
        }),
      })

      const data = await response.json()
      const refined = data.choices?.[0]?.message?.content?.trim()

      if (!refined) return basePrompt

      console.log(`[TextureService] Refined "${basePrompt}" -> "${refined}"`)
      return refined
    } catch (error) {
      console.error(TextureServiceLog.RefinementFailed, error)
      return basePrompt
    }
  }

  async generateTexture(
    prompt: string,
    apiKey: string,
    style: TextureStyle = DEFAULT_TEXTURE_STYLE,
    useSemanticSearch: boolean = false,
    _dimensions: { width: number; height: number } = { width: 1024, height: 1024 }
  ): Promise<string> {
    if (!prompt) throw new Error(TextureServiceError.PromptRequired)
    if (!apiKey) throw new Error(TextureServiceError.ApiKeyRequired)

    let finalPrompt = prompt

    if (useSemanticSearch) {
      finalPrompt = await this.refinePrompt(prompt)
    }

    void TEXTURE_STYLES[style]
    void finalPrompt

    return TextureServicePlaceholder.Url
  }
}

export const textureService = new TextureService()
