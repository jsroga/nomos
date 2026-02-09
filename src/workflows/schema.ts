import { z } from 'zod'

export const WorkflowStateSchema = z.object({
  stepId: z.string(),
  status: z.enum(['pending', 'running', 'suspended', 'completed', 'failed']),
  context: z.record(z.any()),
  history: z.array(
    z.object({
      stepId: z.string(),
      action: z.string(),
      timestamp: z.number(),
    })
  ),
  output: z.any().optional(),
  error: z.string().optional(),
})

export type WorkflowState = z.infer<typeof WorkflowStateSchema>

// Payload for resuming a workflow (User Approval)
export const ResumeWorkflowSchema = z.object({
  workflowId: z.string(),
  stepId: z.string(),
  action: z.enum(['approve', 'reject', 'modify']),
  payload: z.any().optional(),
})

type ResumeWorkflowPayload = z.infer<typeof ResumeWorkflowSchema>
