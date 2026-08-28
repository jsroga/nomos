import { createTool } from '@mastra/core/tools'
import { AnalyzeBalanceOutputSchema } from '../../../core/schemas'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { AnalyzeMechanicBalanceInputSchema } from '../../constants/logic-tool-schemas'
import { buildAnalyzeMechanicBalancePrompt } from '../../constants/logic-tool-prompts'
import { LogicToolCopy, LogicToolId, TargetAudience } from '../../constants/logic-tool-wire'
import {
  createLogicToolModel,
  invokeLlmTextPrompt,
  parseLlmJsonOrError,
} from './game-design-llm-shared'

export const createAnalyzeMechanicBalanceTool = () =>
  createTool({
    id: LogicToolId.AnalyzeMechanicBalance,
    description: `Analyzes the balance of game mechanics within a loop.
Checks for reward imbalances, effort mismatches, dead ends, and grind detection.
Returns a comprehensive balance report with actionable recommendations.`,
    inputSchema: AnalyzeMechanicBalanceInputSchema,
    execute: async (args) => {
      try {
        const mechanics = args.mechanics ?? []
        const resources = args.resources ?? []
        const targetAudience = args.targetAudience ?? TargetAudience.Casual
        const sessionDurationMinutes = args.sessionDurationMinutes ?? 30
        const loopId = args.loopId ?? LogicToolCopy.UnknownLoopId

        if (mechanics.length === 0) {
          return { success: false, error: LogicToolCopy.NoMechanicsToAnalyze }
        }

        const prompt = buildAnalyzeMechanicBalancePrompt({
          mechanics,
          resources,
          targetAudience,
          sessionDurationMinutes,
        })

        const model = createLogicToolModel()
        const content = await invokeLlmTextPrompt(prompt, model)

        const { parsed, error } = parseLlmJsonOrError(content)
        if (!parsed) return { success: false, error }

        const validated = AnalyzeBalanceOutputSchema.parse(parsed)
        return { success: true, loopId, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })
