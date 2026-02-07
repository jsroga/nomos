
import { Agent } from '@mastra/core/agent'
import { withSpan } from './observability'
import { promptRepository } from '../prompts/repository'
import { registerCorePrompts } from '../prompts/registry'

// ==========================================
// CO-PILOT PROTOCOL
// ==========================================
export type CoPilotInteraction =
    | { type: 'ASK_USER'; payload: { question: string; options?: string[] }; thought?: string }
    | { type: 'PROPOSE_PLAN'; payload: { planId: string; summary: string }; thought?: string }
    | { type: 'EXECUTE_STEP'; payload: { stepId: string; tool: string; args?: any }; thought?: string }
    | { type: 'FINISH'; payload: { result: string }; thought?: string }

export interface ExecutiveConfig {
    modelName: string
    planner: any // Mastra Tool instance
    tools: any[] // Mastra Tool instances
    systemPromptKey?: string
}
export class ExecutiveAgent {
    private agent: Agent
    private toolsMap: Record<string, any>

    protected constructor(config: ExecutiveConfig, instructions: string) {
        // Store tools for direct execution
        this.toolsMap = {
            planner_tool: config.planner,
            ...config.tools.reduce((acc, tool) => ({ ...acc, [tool.id]: tool }), {})
        }

        this.agent = new Agent({
            name: 'Executive Agent',
            instructions: instructions,
            model: config.modelName,
            defaultGenerateOptions: {
                toolChoice: 'auto',
            },
            tools: this.toolsMap
        })
    }

    static async create(config: ExecutiveConfig): Promise<ExecutiveAgent> {
        // Initialize Prompts
        registerCorePrompts() // Ensure defaults are registered
        const instructions = await promptRepository.getPrompt(config.systemPromptKey || 'executive-agent-system')
        return new ExecutiveAgent(config, instructions)
    }

    async runLoop(goal: string, context: string): Promise<CoPilotInteraction> {
        return withSpan(crypto.randomUUID(), 'ExecutiveAgent.runLoop', async (span) => {
            try {
                const prompt = await promptRepository.getPrompt('executive-agent-loop', { goal, context })

                // Trace generation
                const response = await this.agent.generate(prompt)
                const raw = response.text

                // Extract Thought
                const thoughtMatch = raw.match(/<thinking>([\s\S]*?)<\/thinking>/)
                const thought = thoughtMatch ? thoughtMatch[1].trim() : 'No thought provided.'

                // Extract JSON
                const jsonMatch = raw.match(/\{[\s\S]*\}/)
                const jsonStr = jsonMatch ? jsonMatch[0] : null

                if (!jsonStr) throw new Error('No JSON found parsing response: ' + raw)

                const result = JSON.parse(jsonStr)
                result.thought = thought
                return result as CoPilotInteraction
            } catch (e: any) {
                console.error('Failed to run agent loop', e)
                return { type: 'FINISH', payload: { result: 'Error: ' + e.message } }
            }
        }, { goal, context })
    }

    async executeStep(stepId: string, toolName: string, args: Record<string, unknown>) {
        return withSpan(crypto.randomUUID(), 'ExecutiveAgent.executeStep', async (span) => {
            console.log(`Executing ${toolName} for step ${stepId}...`)

            const tool = this.toolsMap[toolName]
            if (!tool) {
                const msg = `Tool ${toolName} not found. Available: ${Object.keys(this.toolsMap)}`
                console.error(msg)
                return `Error: ${msg}`
            }

            try {
                // Execute tool
                const result = await tool.execute({ context: args })

                // Update plan status automatically on success
                // We use the planner tool directly to avoid circular agent dependency
                const planner = this.toolsMap['planner_tool']
                if (planner && toolName !== 'planner_tool') { // Avoid double update if planner itself was called? No, planner usage wraps logic.
                    await planner.execute({
                        context: {
                            action: 'update_task_status',
                            taskId: stepId,
                            status: 'completed'
                        }
                    })
                }

                return `Step Executed. Tool Output: ${JSON.stringify(result)}`
            } catch (e: any) {
                console.error(`Tool execution failed: ${e.message}`)

                // Mark Fail using planner
                const planner = this.toolsMap['planner_tool']
                if (planner) {
                    await planner.execute({
                        context: {
                            action: 'update_task_status',
                            taskId: stepId,
                            status: 'failed',
                            feedback: e.message
                        }
                    })
                }

                return `Error executing step: ${e.message}`
            }
        }, { stepId, toolName, args })
    }
}
