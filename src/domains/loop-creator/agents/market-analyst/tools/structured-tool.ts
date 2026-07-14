import { DynamicStructuredTool } from '@langchain/core/tools'
import type { z } from 'zod'

export interface LoopStructuredToolFields {
  name: string
  description: string
  schema: z.ZodTypeAny
  func: (input: Record<string, unknown>) => Promise<string>
}

type LoopStructuredToolCtor = new (fields: LoopStructuredToolFields) => DynamicStructuredTool

/**
 * LangChain's DynamicStructuredTool + Zod can trigger TS2589 on complex schemas.
 * Route construction through a narrow ctor bridge so per-tool files stay clean.
 */
export function createLoopStructuredTool(fields: LoopStructuredToolFields): DynamicStructuredTool {
  const Ctor = DynamicStructuredTool as LoopStructuredToolCtor
  return new Ctor(fields)
}
