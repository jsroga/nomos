
import { describe, it, expect } from 'vitest'
import { HumanLoopWorkflow } from '../../src/workflows/human-loop-workflow'
import { z } from 'zod'

describe('HumanLoopWorkflow Integration', () => {
    it('should initialize and run a workflow', async () => {
        const inputSchema = z.object({
            topic: z.string(),
        })

        const outputSchema = z.object({
            plan: z.string(),
        })

        const workflow = new HumanLoopWorkflow('test-workflow', inputSchema, outputSchema)

        // Add a step so the workflow actually does something
        workflow.addApprovalStep('approval-step', 'Please approve this action')

        // Commit the workflow structure (required by Mastra)
        await workflow.commit()

        // Create a run instance
        const run = await workflow.createRunAsync()

        expect(run).toBeDefined()
        expect(run.runId).toBeDefined()
        expect(typeof run.runId).toBe('string')

        // Start the workflow
        const result = await run.start({
            triggerData: { topic: 'Testing Workflow' }
        })

        // Assert initial state is running or suspended (depending on logic)
        expect(result).toBeDefined()
        expect(result.runId).toBe(run.runId)

        // We expect it to be suspended or have some result indicating the step ran
        // The mock logic in addApprovalStep calls 'suspend' if props.suspend exists
        // If Mastra's run.start() handles suspension, result should reflect that.
    })
})
