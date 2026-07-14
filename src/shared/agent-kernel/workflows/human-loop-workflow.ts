import { Workflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import {
  HUMAN_LOOP_NO_HANDLER_FEEDBACK,
  HUMAN_LOOP_SUSPENDED_FEEDBACK,
  HUMAN_LOOP_WAITING_REASON,
  HumanLoopApprovalAction,
} from '@/shared/agent-kernel/workflows/constants/human-loop-workflow'

export class HumanLoopWorkflow extends Workflow {
  constructor(name: string) {
    super({ id: name, inputSchema: z.object({ context: z.any() }), outputSchema: z.any() })
  }

  // Helper to register an approval step
  addApprovalStep(stepId: string, _description: string) {
    const step = createStep({
      id: stepId,
      inputSchema: z.object({
        context: z.any(),
      }),
      outputSchema: z.object({
        approved: z.boolean(),
        feedback: z.string().optional(),
      }),
      execute: async (props: any) => {
        const { context, suspend } = props
        // Determine if we need to suspend
        // In a real generic implementation, we'd check if approval is already present in context
        if (context && context.approvalAction) {
          return {
            approved: context.approvalAction === HumanLoopApprovalAction.Approve,
            feedback: context.approvalFeedback,
          }
        }

        // Suspend execution!
        if (suspend) {
          await suspend({ reason: HUMAN_LOOP_WAITING_REASON, stepId })
          return { approved: false, feedback: HUMAN_LOOP_SUSPENDED_FEEDBACK }
        }

        return { approved: false, feedback: HUMAN_LOOP_NO_HANDLER_FEEDBACK }
      },
    })

    this.then(step)
  }
}
