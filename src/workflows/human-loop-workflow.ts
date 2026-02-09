import { Workflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'

export class HumanLoopWorkflow extends Workflow {
  constructor(name: string) {
    super({ id: name, inputSchema: z.object({ context: z.any() }), outputSchema: z.any() })
  }

  // Helper to register an approval step
  addApprovalStep(stepId: string, description: string) {
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
            approved: context.approvalAction === 'approve',
            feedback: context.approvalFeedback,
          }
        }

        // Suspend execution!
        if (suspend) {
          await suspend({ reason: 'Waiting for approval', stepId })
          return { approved: false, feedback: 'Suspended for approval' }
        }

        return { approved: false, feedback: 'No suspension handler available' }
      },
    })

    this.then(step)
  }
}
