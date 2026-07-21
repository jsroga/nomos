import { createTool } from '@mastra/core/tools'
import type { z } from 'zod'
import { recordFromJson } from '@/shared/data/json-guards'

export interface LoopStructuredToolFields {
  name: string
  description: string
  schema: z.ZodTypeAny
  func: (input: Record<string, unknown>) => Promise<string>
}

const TOOL_OUTPUT_KEY = 'output'

/**
 * Single bridge for the market-analyst tools. Emits a native Mastra `createTool`
 * (the agent is a Mastra `Agent`; this drops the former LangChain
 * `DynamicStructuredTool` + runtime adapter). Each tool `func` returns a string,
 * surfaced to the model as `{ output }` — the exact shape the old adapter produced,
 * so tool-calling behavior is unchanged. Per-tool files are untouched.
 */
export function createLoopStructuredTool(fields: LoopStructuredToolFields) {
  return createTool({
    id: fields.name,
    description: fields.description,
    inputSchema: fields.schema,
    execute: async inputData => {
      const result = await fields.func(recordFromJson(inputData))
      return { [TOOL_OUTPUT_KEY]: result }
    },
  })
}
