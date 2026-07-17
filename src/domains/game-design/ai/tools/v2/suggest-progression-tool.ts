import { createTool } from '@mastra/core/tools'
import { SuggestProgressionToolInputSchema } from '../../constants/logic-tool-schemas'
import { LogicToolId } from '../../constants/logic-tool-wire'
import {
  buildSuggestProgressionPromptFromLoop,
  resolveSuggestProgressionInputs,
  runSuggestProgressionLlm,
  suggestProgressionMissingLoopError,
} from './suggest-progression-helpers'

export const createSuggestProgressionTool = () =>
  createTool({
    id: LogicToolId.SuggestProgression,
    description: `Suggests ways to expand and improve a game loop's progression system.
Can suggest new mechanics, balance tweaks, or progression gates based on the
desired expansion direction (depth, breadth, or complexity).`,
    inputSchema: SuggestProgressionToolInputSchema,
    execute: async (args) => {
      const inputs = resolveSuggestProgressionInputs(args)
      if (!inputs.currentLoop) {
        return suggestProgressionMissingLoopError()
      }

      const prompt = buildSuggestProgressionPromptFromLoop(inputs.currentLoop, inputs)
      return runSuggestProgressionLlm(prompt)
    },
  })
