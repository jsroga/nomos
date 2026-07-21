import { ChatOpenAI } from '@langchain/openai'
import { OPENROUTER_AUTO_MODEL, openRouterClientConfig } from '@/shared/agent-kernel/models'
import {
  GameDesignLlmRole,
  GameDesignLlmTemperature,
  GameDesignToolCopy,
} from '../../constants/game-design-tool-wire'

/** ChatOpenAI pointed at OpenRouter (single OPENROUTER_API_KEY), default openrouter/auto-beta. */
function createOpenRouterChat(temperature: number): ChatOpenAI {
  const openRouter = openRouterClientConfig()
  return new ChatOpenAI({
    model: OPENROUTER_AUTO_MODEL,
    temperature,
    apiKey: openRouter.apiKey,
    configuration: { baseURL: openRouter.baseURL },
  })
}

export function createHauteGameModel() {
  return createOpenRouterChat(GameDesignLlmTemperature.Creative)
}

export function createLogicToolModel() {
  return createOpenRouterChat(GameDesignLlmTemperature.Analytical)
}

export function extractJsonFromLlmContent(content: string): unknown {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(GameDesignToolCopy.NoJsonInResponse)
  }
  return JSON.parse(jsonMatch[0])
}

export async function invokeLlmJsonPrompt(prompt: string, model: ChatOpenAI): Promise<unknown> {
  const response = await model.invoke([{ role: GameDesignLlmRole.User, content: prompt }])
  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
  return extractJsonFromLlmContent(content)
}

export function parseLlmJsonOrError(content: string): { parsed?: unknown; error?: string } {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { error: GameDesignToolCopy.FailedToParseAiResponse }
  }
  return { parsed: JSON.parse(jsonMatch[0]) }
}
