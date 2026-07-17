import { ChatOpenAI } from '@langchain/openai'
import {
  GameDesignLlmModel,
  GameDesignLlmRole,
  GameDesignLlmTemperature,
  GameDesignToolCopy,
} from '../../constants/game-design-tool-wire'

export function createHauteGameModel() {
  return new ChatOpenAI({
    modelName: GameDesignLlmModel.Gpt4o,
    temperature: GameDesignLlmTemperature.Creative,
  })
}

export function createLogicToolModel() {
  return new ChatOpenAI({
    modelName: GameDesignLlmModel.Gpt4o,
    temperature: GameDesignLlmTemperature.Analytical,
  })
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
