import { SuggestProgressionOutputSchema } from '../../../core/schemas'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { buildSuggestProgressionPrompt } from '../../constants/logic-tool-prompts'
import { SuggestProgressionToolInputSchema } from '../../constants/logic-tool-schemas'
import {
  ExpansionDirection,
  GameDesignToolCopy,
  LogicToolCopy,
  joinWithCommaSpace,
} from '../../constants/logic-tool-wire'
import { GameDesignLlmRole } from '../../constants/game-design-tool-wire'
import type { GameResource } from '../../constants/logic-tool-schemas'
import { createLogicToolModel, parseLlmJsonOrError } from './game-design-llm-shared'
import type { z } from 'zod'

type SuggestProgressionArgs = z.infer<typeof SuggestProgressionToolInputSchema>

export function resolveSuggestProgressionInputs(args: SuggestProgressionArgs) {
  return {
    currentLoop: args.currentLoop,
    existingMechanics: args.existingMechanics ?? [],
    expansionDirection: args.expansionDirection ?? ExpansionDirection.Depth,
    theme: args.theme ?? GameDesignToolCopy.NotSpecified,
    genre: args.genre ?? GameDesignToolCopy.NotSpecified,
    targetAudience: args.targetAudience ?? GameDesignToolCopy.NotSpecified,
  }
}

export function buildSuggestProgressionPromptFromLoop(
  currentLoop: SuggestProgressionArgs['currentLoop'],
  inputs: ReturnType<typeof resolveSuggestProgressionInputs>
) {
  return buildSuggestProgressionPrompt({
    loopName: currentLoop.name ?? GameDesignToolCopy.Unknown,
    loopType: currentLoop.type ?? GameDesignToolCopy.Unknown,
    resourceNames: currentLoop.resources?.length
      ? joinWithCommaSpace(currentLoop.resources.map((resource: GameResource) => resource.name))
      : GameDesignToolCopy.NoneDefined,
    nodeCount: currentLoop.nodes?.length ?? 0,
    edgeCount: currentLoop.edges?.length ?? 0,
    existingMechanics: inputs.existingMechanics,
    expansionDirection: inputs.expansionDirection,
    theme: inputs.theme,
    genre: inputs.genre,
    targetAudience: inputs.targetAudience,
  })
}

export async function runSuggestProgressionLlm(prompt: string) {
  try {
    const model = createLogicToolModel()
    const response = await model.invoke([{ role: GameDesignLlmRole.User, content: prompt }])
    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    const { parsed, error } = parseLlmJsonOrError(content)
    if (!parsed) return { success: false as const, error }

    const validated = SuggestProgressionOutputSchema.parse(parsed)
    return { success: true as const, ...validated }
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export function suggestProgressionMissingLoopError() {
  return { success: false as const, error: LogicToolCopy.CurrentLoopRequired }
}
