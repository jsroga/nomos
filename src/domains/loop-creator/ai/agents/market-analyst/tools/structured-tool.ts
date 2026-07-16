import { DynamicStructuredTool } from '@langchain/core/tools'
import type { z } from 'zod'

export interface LoopStructuredToolFields {
  name: string
  description: string
  schema: z.ZodTypeAny
  func: (input: Record<string, unknown>) => Promise<string>
}

/**
 * LangChain's DynamicStructuredTool + Zod can trigger TS2589 on complex schemas.
 * Route construction through a single bridge so per-tool files stay clean.
 */
export function createLoopStructuredTool(fields: LoopStructuredToolFields): DynamicStructuredTool {
  // @ts-expect-error TS2589 — LangChain DynamicStructuredTool + Zod exceeds TS recursion limit
  return new DynamicStructuredTool({
    name: fields.name,
    description: fields.description,
    schema: fields.schema,
    func: fields.func,
  })
}
