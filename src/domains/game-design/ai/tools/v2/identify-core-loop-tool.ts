import { createTool } from '@mastra/core/tools'
import {
  IdentifyCoreLoopInputSchema,
  IdentifyCoreLoopOutputSchema,
} from '../../../core/schemas'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { buildIdentifyCoreLoopPrompt } from '../../constants/logic-tool-prompts'
import { LogicToolCopy, LogicToolId, TargetAudience } from '../../constants/logic-tool-wire'
import {
  createLogicToolModel,
  invokeLlmTextPrompt,
  parseLlmJsonOrError,
} from './game-design-llm-shared'

export const createIdentifyCoreLoopTool = () =>
  createTool({
    id: LogicToolId.IdentifyCoreLoop,
    description: `Analyzes a set of game mechanics and identifies the core gameplay loop.
This tool uses AI to determine which mechanics form the central engagement cycle,
what psychological hooks are at play, and how long each cycle typically takes.`,
    inputSchema: IdentifyCoreLoopInputSchema,
    execute: async (args) => {
      try {
        const mechanics = args.mechanics ?? []
        const genre = args.genre ?? LogicToolCopy.UnknownGenre
        const targetAudience = args.targetAudience ?? TargetAudience.Casual

        if (mechanics.length === 0) {
          return { success: false, error: LogicToolCopy.NoMechanicsForCoreLoop }
        }

        const prompt = buildIdentifyCoreLoopPrompt({
          mechanics,
          genre,
          targetAudience,
        })

        const model = createLogicToolModel()
        const content = await invokeLlmTextPrompt(prompt, model)

        const { parsed, error } = parseLlmJsonOrError(content)
        if (!parsed) return { success: false, error }

        const validated = IdentifyCoreLoopOutputSchema.parse(parsed)
        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })
