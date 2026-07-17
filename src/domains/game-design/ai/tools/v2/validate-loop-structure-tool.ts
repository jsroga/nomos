import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  ValidateLoopStructureInputSchema,
  ValidateLoopStructureOutputSchema,
} from '../../constants/logic-tool-schemas'
import { LogicToolCopy, LogicToolId, ValidateLoopSeverity } from '../../constants/logic-tool-wire'
import { validateLoopStructure } from './validate-loop-structure-helpers'

export const createValidateLoopStructureTool = () =>
  createTool({
    id: LogicToolId.ValidateLoopStructure,
    description: `Validates the structural integrity of a game loop.
Checks for orphan nodes, missing mechanics, broken cycles, and unreachable states.
Returns validation results with specific issues and graph metrics.`,
    inputSchema: ValidateLoopStructureInputSchema,
    execute: async (args: z.infer<typeof ValidateLoopStructureInputSchema>) => {
      try {
        const loop = args.loop
        const mechanics = args.mechanics ?? []

        if (!loop?.nodes || !loop.edges) {
          return { success: false, error: LogicToolCopy.LoopMalformed }
        }

        const { issues, cycleDetected } = validateLoopStructure(loop, mechanics)
        const hasErrors = issues.some(issue => issue.severity === ValidateLoopSeverity.Error)

        const output = {
          success: true,
          isValid: !hasErrors,
          issues,
          metrics: {
            nodeCount: loop.nodes.length,
            edgeCount: loop.edges.length,
            cycleDetected,
          },
        }

        ValidateLoopStructureOutputSchema.parse({
          isValid: output.isValid,
          issues: output.issues,
          metrics: output.metrics,
        })
        return output
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })
