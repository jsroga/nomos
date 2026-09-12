import '@/shared/data/server-guard'
import { Agent } from '@mastra/core/agent'
import type { ZodType } from 'zod'
import { resolveGameDesignModel } from '@/domains/game-design/config/model-config'
import { EDITOR_DISABLED } from '@/shared/agent-kernel/mastra/editor-permissions'
import { mastraCompletionSettings } from '@/shared/ai/gateway/output-budget'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import {
  GameDesignLlmTemperature,
  GameDesignToolCopy,
} from '../../constants/game-design-tool-wire'
import {
  GameDesignStructuredOutputErrorStrategy,
  GameDesignToolStructurer,
} from '../../constants/agent-identity'

/**
 * A temperature-bound handle on the OpenRouter model.
 *
 * Tool execute receives only schema-declared args, so there is no
 * `ProjectScope` to bill against without changing every tool's input contract.
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

let toolStructuringAgent: Agent | undefined

function getToolStructuringAgent(): Agent {
  if (!toolStructuringAgent) {
    toolStructuringAgent = new Agent({
      id: GameDesignToolStructurer.Id,
      name: GameDesignToolStructurer.Name,
      instructions: GameDesignToolStructurer.Instructions,
      model: () => resolveGameDesignModel(),
      editor: EDITOR_DISABLED,
      defaultOptions: mastraCompletionSettings(LlmFeature.GameDesign),
    })
  }
  return toolStructuringAgent
}

export async function invokeLlmJsonPrompt<T>(
  prompt: string,
  model: GameDesignModel,
  schema: ZodType<T>
): Promise<T> {
  const agent = getToolStructuringAgent()
  const response = await agent.generate(prompt, {
    structuredOutput: {
      schema,
      errorStrategy: GameDesignStructuredOutputErrorStrategy.Warn,
    },
    ...mastraCompletionSettings(LlmFeature.GameDesign, { temperature: model.temperature }),
  })
  const parsed = schema.safeParse(response.object)
  if (!parsed.success) {
    throw new Error(GameDesignToolCopy.FailedToParseAiResponse)
  }
  return parsed.data
}
