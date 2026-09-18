import { createTool } from '@mastra/core/tools'
import type { z } from 'zod'
import { recordFromJson } from '@/shared/data/json-guards'

export enum LoopStructuredToolOutputField {
  Output = 'output',
}

export interface LoopStructuredToolFields {
  name: string
  description: string
  schema: z.ZodTypeAny
  func: (input: Record<string, unknown>) => Promise<string>
}

/**
 * Single bridge for the market-analyst tools. Emits a native Mastra `createTool`
 * (the agent is a Mastra `Agent`). Each tool `func` returns a string,
 * surfaced to the model as `{ output }`. Per-tool files are untouched.
 */
export function createLoopStructuredTool(fields: LoopStructuredToolFields) {
  return createTool({
    id: fields.name,
    description: fields.description,
    inputSchema: fields.schema,
    execute: async inputData => {
      const result = await fields.func(recordFromJson(inputData))
      return { [LoopStructuredToolOutputField.Output]: result }
    },
  })
}
