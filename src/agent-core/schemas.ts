
import { z } from 'zod'

// ==========================================
// 1. Todo Item Schema
// ==========================================
export const PlanItemStatusSchema = z.enum([
    'pending',
    'in-progress',
    'completed',
    'failed',
    'skipped'
])

export type PlanItemStatus = z.infer<typeof PlanItemStatusSchema>

export const PlanItemSchema = z.object({
    id: z.string().describe('Unique identifier (e.g., \'1\', \'1.2\')'),
    title: z.string().describe('Concise task title'),
    description: z.string().optional().describe('More detailed instructions'),
    status: PlanItemStatusSchema.default('pending'),
    dependencies: z.array(z.string()).optional().describe('IDs of tasks that must be finished first'),
    metadata: z.record(z.unknown()).optional().describe('Domain-specific data (e.g. plot points, ECS entities)')
})

export type PlanItem = z.infer<typeof PlanItemSchema>

// ==========================================
// 2. The Plan Schema (The "TodoArtifact")
// ==========================================
export const PlanSchema = z.object({
    id: z.string().uuid().describe('Unique Plan ID'),
    goal: z.string().describe('High-level objective of this plan'),
    context: z.string().optional().describe('Why this plan exists'),
    items: z.array(PlanItemSchema).describe('Ordered list of tasks'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    version: z.number().default(1)
})

export type Plan = z.infer<typeof PlanSchema>

// ==========================================
// 3. Executive Memory Schema
// ==========================================
// Snapshot of the agent's brain state
export const ExecutiveStateSchema = z.object({
    plan: PlanSchema,
    currentTaskId: z.string().nullable(),
    thoughts: z.array(z.string()).describe('Stream of consciousness log'),
    errors: z.array(z.string()).describe('Encountered errors'),
    variables: z.record(z.unknown()).describe('Scratchpad memory')
})

export type ExecutiveState = z.infer<typeof ExecutiveStateSchema>
