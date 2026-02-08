import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { storyCreationWorkflow } from '../../agents/v2'
import { workflowStore, getWorkflowEventBus, getWorkflowTraceId, WORKFLOW_EVENTS } from '../../utils/workflow-context'
import { v4 as uuidv4 } from 'uuid'

/**
 * Tool to trigger the hierarchical Story Creation Workflow.
 * This allows the main Storyteller Agent to delegate complex content generation
 * to the council of sub-agents (Psychologist, Gardener, etc.).
 *
 * Supports human-in-the-loop: When workflow suspends for user input,
 * this tool waits for the user to respond via the resume API.
 */
export const runStoryCreationWorkflowTool = createTool({
    id: 'run_story_creation_workflow',
    description: 'Generates high-quality story content, world-building, or lore using a multi-agent workflow (Psychologist, Consequence, Gardener, Devil\'s Advocate). Use this for drafting scenes, defining world rules, or checking detailed consistency.',
    inputSchema: z.object({
        goal: z.string().describe('The specific goal for the workflow (e.g. "Write a scene where X confronts Y about Z")'),
        narrativeContext: z.string().describe('The narrative context required for the agents to understand the situation.'),
        projectId: z.string().describe('The project ID.'),
    }),
    execute: async (args: any) => {
        const context = args?.context || args;
        try {
            const { goal, narrativeContext: storyContext, projectId } = context
            const traceId = getWorkflowTraceId()
            const runId = uuidv4()

            // Execute the Mastra workflow via formal run mechanism
            const run = await storyCreationWorkflow.createRun({
                runId
            })

            let result = await run.start({
                inputData: {
                    goal,
                    narrativeContext: storyContext,
                    projectId,
                    traceId
                }
            })

            // Handle suspended workflow (human-in-the-loop)
            if (result.status === 'suspended') {
                // In Mastra 0.24.9, suspended contains the IDs of the suspended steps
                const suspendedStepId = result.suspended?.[0]?.[0] || 'creative_decision'
                const suspendPayload = result.suspendPayload

                // Create a promise that will be resolved when user responds
                const resumePromise = new Promise<{ selectedOption: string; additionalFeedback?: string }>((resolve) => {
                    // Store the workflow with resolve function
                    workflowStore.suspend({
                        runId,
                        stepId: suspendedStepId,
                        projectId,
                        traceId,
                        suspendPayload,
                        resolveResume: resolve
                    })

                    // Emit event for UI with runId
                    const bus = getWorkflowEventBus()
                    if (bus) {
                        bus.emit(WORKFLOW_EVENTS.WORKFLOW_SUSPENDED, {
                            runId,
                            stepId: suspendedStepId,
                            projectId,
                            traceId
                        })
                    }
                })

                // Wait for user to respond (with timeout)
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('Workflow timed out waiting for user input')), 5 * 60 * 1000) // 5 min
                })

                let resumeData: { selectedOption: string; additionalFeedback?: string }
                try {
                    resumeData = await Promise.race([resumePromise, timeoutPromise])
                } catch (timeoutError) {
                    // Assuming run.resume logic or similar
                    return `⏰ The workflow timed out waiting for your creative decision. Please try again.`
                }

                // Resume the workflow with user's choice
                result = await run.resume({
                    step: suspendedStepId,
                    resumeData
                })

                // Emit resumed event
                const bus = getWorkflowEventBus()
                if (bus) {
                    bus.emit(WORKFLOW_EVENTS.WORKFLOW_RESUMED, {
                        runId,
                        selectedOption: resumeData.selectedOption
                    })
                }
            }

            // Extract the final output from the synthesis step
            const synthesisResult = result.steps?.['synthesis']

            if (synthesisResult && synthesisResult.status === 'success') {
                const draft = (result.steps?.['drafting'] as any)?.output?.draft
                const critique = (result.steps?.['critique'] as any)?.output?.critique
                const analysis = (result.steps?.['psychological_analysis'] as any)?.output?.analysis
                const logic = (result.steps?.['consequence_check'] as any)?.output?.validation
                const final = (synthesisResult as any).output.finalOutput

                // Return a rich formatted string that shows all agents contributed
                return `## 🧠 Council Analysis
### Psychologist
${analysis || 'No analysis provided.'}

### Consequence Tracker
${logic || 'No logic checks provided.'}

## ✍️ Drafting Phase (The Gardener)
${draft || 'Draft generation failed.'}

## ⚖️ Devil's Advocate Critique
${critique || 'No critique provided.'}

## 🎬 Final Synthesis (Storyteller)
${final}`
            }

            return `Workflow completed but output was not found. Status: ${result.status}`

        } catch (error: any) {
            console.error('Story Creation Workflow Failed:', error)
            return `Workflow failed: ${error.message}`
        }
    }
})
