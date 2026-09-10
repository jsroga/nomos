import { createTool } from '@mastra/core/tools'
import { AnalyzeBalanceOutputSchema } from '../../../core/schemas'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { AnalyzeMechanicBalanceInputSchema } from '../../constants/logic-tool-schemas'
import { buildAnalyzeMechanicBalancePrompt } from '../../prompts/logic-tool-prompts'
import { LogicToolCopy, LogicToolId, TargetAudience } from '../../utils/logic-tool-wire'
import { createLogicToolModel, invokeLlmJsonPrompt } from './game-design-llm-shared'

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
        const validated = await invokeLlmJsonPrompt(
          prompt,
          model,
          AnalyzeBalanceOutputSchema,
        )
        return { success: true, loopId, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })
