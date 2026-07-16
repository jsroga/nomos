import {
  isValidationError,
  noopObserve,
  type ToolExecutionContext,
  type ValidationError,
} from '@mastra/core/tools'
import type { GameDesignTool } from './game-design-tools'

export async function invokeGameDesignTool(
  tool: GameDesignTool,
  input: Record<string, unknown>
): Promise<unknown> {
  if (!tool.execute) {
    throw new Error(`Tool ${tool.id} has no execute function`)
  }

  const result = await tool.execute(input, { observe: noopObserve })
  if (result === undefined || result === null) {
    throw new Error(`Tool ${tool.id} returned no result`)
  }
  if (isValidationError(result)) {
    throw new Error(`Tool ${tool.id} input validation failed: ${JSON.stringify(result)}`)
  }
  return result
}

export type { ToolExecutionContext, ValidationError }
