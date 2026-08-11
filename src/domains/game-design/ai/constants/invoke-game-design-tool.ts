import {
  isValidationError,
  noopObserve,
  type ToolExecutionContext,
  type ValidationError,
} from '@mastra/core/tools'
import type { GameDesignTool } from './game-design-tools'

/**
 * Unioned Mastra tool `execute` input types collapse to `never`. Call through
 * Function.prototype.apply so we don't need a type assertion at the boundary.
 */
export async function invokeGameDesignTool(
  tool: GameDesignTool,
  input: Record<string, unknown>
): Promise<unknown> {
  if (typeof tool.execute !== 'function') {
    throw new Error(`Tool ${tool.id} has no execute function`)
  }

  const applied: unknown = Function.prototype.apply.call(tool.execute, undefined, [
    input,
    { observe: noopObserve },
  ])
  const result = await Promise.resolve(applied)
  if (result === undefined || result === null) {
    throw new Error(`Tool ${tool.id} returned no result`)
  }
  if (isValidationError(result)) {
    throw new Error(`Tool ${tool.id} input validation failed: ${JSON.stringify(result)}`)
  }
  return result
}

export type { ToolExecutionContext, ValidationError }
