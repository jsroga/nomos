import { z } from 'zod'
import {
  PLAN_ITEM_DEFAULT_STATUS,
  PlanSchemaDescription,
} from '@/shared/agent-kernel/constants/plan-schemas'

export const PlanItemStatusSchema = z.enum([
  'pending',
  'in-progress',
  'completed',
  'failed',
  'skipped',
])

export type PlanItemStatus = z.infer<typeof PlanItemStatusSchema>

export const PlanItemSchema = z.object({
  id: z.string().describe(PlanSchemaDescription.ItemId),
  title: z.string().describe(PlanSchemaDescription.ItemTitle),
  description: z.string().optional().describe(PlanSchemaDescription.ItemDescription),
  status: PlanItemStatusSchema.default(PLAN_ITEM_DEFAULT_STATUS),
  dependencies: z.array(z.string()).optional().describe(PlanSchemaDescription.ItemDependencies),
  metadata: z
    .record(z.unknown())
    .optional()
    .describe(PlanSchemaDescription.ItemMetadata),
})

export type PlanItem = z.infer<typeof PlanItemSchema>

export const PlanSchema = z.object({
  id: z.string().uuid().describe(PlanSchemaDescription.PlanId),
  goal: z.string().describe(PlanSchemaDescription.PlanGoal),
  context: z.string().optional().describe(PlanSchemaDescription.PlanContext),
  items: z.array(PlanItemSchema).describe(PlanSchemaDescription.PlanItems),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().default(1),
})

export type Plan = z.infer<typeof PlanSchema>

export const ExecutiveStateSchema = z.object({
  plan: PlanSchema,
  currentTaskId: z.string().nullable(),
  thoughts: z.array(z.string()).describe(PlanSchemaDescription.ExecutiveThoughts),
  errors: z.array(z.string()).describe(PlanSchemaDescription.ExecutiveErrors),
  variables: z.record(z.unknown()).describe(PlanSchemaDescription.ExecutiveVariables),
})
