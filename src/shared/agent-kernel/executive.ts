import { Agent } from '@mastra/core/agent'
import { withMastraSpan } from '@/shared/observability/mastra-tracing'
import { promptRepository } from './prompts/repository'
import { registerCorePrompts } from './prompts/registry'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  CoPilotInteractionType,
  EXECUTIVE_ERROR_PREFIX,
  EXECUTIVE_INVALID_PAYLOAD,
  EXECUTIVE_NO_JSON_ERROR,
  EXECUTIVE_NO_THOUGHT,
  EXECUTIVE_PLANNER_COMPLETED_STATUS,
  EXECUTIVE_PLANNER_FAILED_STATUS,
  EXECUTIVE_PLANNER_TOOL_ID,
  EXECUTIVE_PLANNER_UPDATE_ACTION,
  EXECUTIVE_RUN_LOOP_FAILED,
  ExecutiveAgentId,
  ExecutiveJsonField,
  ExecutivePromptKey,
  ExecutiveSpanName,
  ExecutiveToolChoice,
} from '@/shared/agent-kernel/constants/executive-agent'

// ==========================================
// CO-PILOT PROTOCOL
// ==========================================
export type CoPilotInteraction =
  | { type: CoPilotInteractionType.AskUser; payload: { question: string; options?: string[] }; thought?: string }
  | { type: CoPilotInteractionType.ProposePlan; payload: { planId: string; summary: string }; thought?: string }
  | {
    type: CoPilotInteractionType.ExecuteStep
    payload: { stepId: string; tool: string; args?: unknown }
    thought?: string
  }
  | { type: CoPilotInteractionType.Finish; payload: { result: string }; thought?: string }

function isCoPilotInteraction(value: unknown): value is CoPilotInteraction {
  if (typeof value !== 'object' || value === null || !(ExecutiveJsonField.Type in value)) return false
  const type = value.type
  return (
    type === CoPilotInteractionType.AskUser ||
    type === CoPilotInteractionType.ProposePlan ||
    type === CoPilotInteractionType.ExecuteStep ||
    type === CoPilotInteractionType.Finish
  )
}

/** Minimal structural view of the Mastra tools the executive orchestrates. */
interface ExecutiveTool {
  id: string
  execute: (input: unknown) => Promise<unknown>
}

export interface ExecutiveConfig {
  modelName: string
  planner: ExecutiveTool
  tools: ExecutiveTool[]
  systemPromptKey?: string
}
export class ExecutiveAgent {
  private agent: Agent
  private toolsMap: Record<string, ExecutiveTool>

  protected constructor(config: ExecutiveConfig, instructions: string) {
    this.toolsMap = {
      [EXECUTIVE_PLANNER_TOOL_ID]: config.planner,
      ...config.tools.reduce((acc, tool) => ({ ...acc, [tool.id]: tool }), {}),
    }

    this.agent = new Agent({
      name: ExecutiveAgentId.Name,
      id: ExecutiveAgentId.Id,
      instructions: instructions,
      model: config.modelName,
      defaultGenerateOptionsLegacy: {
        toolChoice: ExecutiveToolChoice.Auto,
      },
      tools: this.toolsMap,
    })
  }

  static async create(config: ExecutiveConfig): Promise<ExecutiveAgent> {
    registerCorePrompts()
    const instructions = await promptRepository.getPrompt(
      config.systemPromptKey || ExecutivePromptKey.System
    )
    return new ExecutiveAgent(config, instructions)
  }

  async runLoop(goal: string, context: string): Promise<CoPilotInteraction> {
    return withMastraSpan(
      crypto.randomUUID(),
      ExecutiveSpanName.RunLoop,
      async _span => {
        try {
          const prompt = await promptRepository.getPrompt(ExecutivePromptKey.Loop, { goal, context })

          const response = await this.agent.generate(prompt)
          const raw = response.text

          const thoughtMatch = raw.match(/<thinking>([\s\S]*?)<\/thinking>/)
          const thought = thoughtMatch ? thoughtMatch[1].trim() : EXECUTIVE_NO_THOUGHT

          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          const jsonStr = jsonMatch ? jsonMatch[0] : null

          if (!jsonStr) throw new Error(EXECUTIVE_NO_JSON_ERROR + raw)

          const result = JSON.parse(jsonStr)
          result.thought = thought
          if (!isCoPilotInteraction(result)) {
            throw new Error(EXECUTIVE_INVALID_PAYLOAD)
          }
          return result
        } catch (e: unknown) {
          console.error(EXECUTIVE_RUN_LOOP_FAILED, e)
          return {
            type: CoPilotInteractionType.Finish,
            payload: { result: EXECUTIVE_ERROR_PREFIX + getErrorMessage(e) },
          }
        }
      },
      { goal, context }
    )
  }

  async executeStep(stepId: string, toolName: string, args: Record<string, unknown>) {
    return withMastraSpan(
      crypto.randomUUID(),
      ExecutiveSpanName.ExecuteStep,
      async _span => {
        console.log(`Executing ${toolName} for step ${stepId}...`)

        const tool = this.toolsMap[toolName]
        if (!tool) {
          const msg = `Tool ${toolName} not found. Available: ${Object.keys(this.toolsMap)}`
          console.error(msg)
          return `${EXECUTIVE_ERROR_PREFIX}${msg}`
        }

        try {
          const result = await tool.execute(args)

          const planner = this.toolsMap[EXECUTIVE_PLANNER_TOOL_ID]
          if (planner && toolName !== EXECUTIVE_PLANNER_TOOL_ID) {
            await planner.execute({
              action: EXECUTIVE_PLANNER_UPDATE_ACTION,
              taskId: stepId,
              status: EXECUTIVE_PLANNER_COMPLETED_STATUS,
            })
          }

          return `Step Executed. Tool Output: ${JSON.stringify(result)}`
        } catch (e: unknown) {
          console.error(`Tool execution failed: ${getErrorMessage(e)}`)

          const planner = this.toolsMap[EXECUTIVE_PLANNER_TOOL_ID]
          if (planner) {
            await planner.execute({
              action: EXECUTIVE_PLANNER_UPDATE_ACTION,
              taskId: stepId,
              status: EXECUTIVE_PLANNER_FAILED_STATUS,
              feedback: getErrorMessage(e),
            })
          }

          return `Error executing step: ${getErrorMessage(e)}`
        }
      },
      { stepId, toolName, args }
    )
  }
}
