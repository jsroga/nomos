import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { OPENROUTER_AUTO_MODEL, openRouterClientConfig } from '@/shared/agent-kernel/models'
import {
  GameDesignLlmRole,
  GameDesignLlmTemperature,
  GameDesignToolCopy,
} from '../../constants/game-design-tool-wire'

/**
 * A temperature-bound handle on the OpenRouter model.
 *
 * **Not the gateway, and that is the open item here.** These run inside Mastra
 * tools whose `execute` receives only schema-declared args, so there is no
 * `ProjectScope` to bill against without changing every tool's input contract
 * — a change a model can silently get wrong by omitting the field. LangChain
 * is gone; the metering is recorded as remaining work in SPEC-13.
 */
export interface GameDesignModel {
  temperature: number
}

export function createHauteGameModel(): GameDesignModel {
  return { temperature: GameDesignLlmTemperature.Creative }
}

export function createLogicToolModel(): GameDesignModel {
  return { temperature: GameDesignLlmTemperature.Analytical }
}

export function extractJsonFromLlmContent(content: string): unknown {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(GameDesignToolCopy.NoJsonInResponse)
  }
  return JSON.parse(jsonMatch[0])
}

/** Raw text from the model, for callers that parse it themselves. */
export async function invokeLlmTextPrompt(prompt: string, model: GameDesignModel): Promise<string> {
  const openRouter = openRouterClientConfig()
  const openrouter = createOpenAI({ apiKey: openRouter.apiKey, baseURL: openRouter.baseURL })
  const { text } = await generateText({
    model: openrouter(OPENROUTER_AUTO_MODEL),
    temperature: model.temperature,
    messages: [{ role: GameDesignLlmRole.User, content: prompt }],
  })
  return text
}

export async function invokeLlmJsonPrompt(
  prompt: string,
  model: GameDesignModel
): Promise<unknown> {
  const openRouter = openRouterClientConfig()
  const openrouter = createOpenAI({ apiKey: openRouter.apiKey, baseURL: openRouter.baseURL })
  const { text } = await generateText({
    model: openrouter(OPENROUTER_AUTO_MODEL),
    temperature: model.temperature,
    messages: [{ role: GameDesignLlmRole.User, content: prompt }],
  })
  return extractJsonFromLlmContent(text)
}

export function parseLlmJsonOrError(content: string): { parsed?: unknown; error?: string } {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { error: GameDesignToolCopy.FailedToParseAiResponse }
  }
  return { parsed: JSON.parse(jsonMatch[0]) }
}
