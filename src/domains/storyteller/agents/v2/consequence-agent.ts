import { Agent } from '@mastra/core/agent'
import { v4 as uuidv4 } from 'uuid'
import {
  createAgentTrace,
  recordAgentGeneration,
  recordAgentThinking,
  withSpan,
} from '../../../../agent-core/observability'
import { getWorkflowTraceId } from '../../utils/workflow-context'
import { CONSEQUENCE_TRACKER_PROMPT } from '../../prompts/agents/consequence-tracker'
import { checkContinuityTool, quickConsistencyCheckTool } from '../../tools/v2'
import { getMastraInstance } from './mastra-instance'

interface ConsequenceConfig {
  modelName: string
  traceId?: string
  projectId?: string
  episodeId?: string
}

export class ConsequenceAgent {
  private agent: Agent
  private toolsMap: Record<string, unknown>
  private traceId: string
  private config: ConsequenceConfig

  private constructor(config: ConsequenceConfig, instructions: string) {
    this.config = config
    this.traceId = config.traceId || getWorkflowTraceId() || uuidv4()

    const tools = [checkContinuityTool, quickConsistencyCheckTool]

    this.toolsMap = tools.reduce((acc, tool) => ({ ...acc, [tool.id]: tool }), {})

    const m = getMastraInstance()
    // Use string model identifier for Mastra AI SDK v5 compatibility
    const modelString = config.modelName.replace(':', '/')

    this.agent = new Agent({
      id: 'consequence-agent',
      name: 'Consequence Agent',
      instructions,
      model: modelString,
      tools: this.toolsMap,
      mastra: m,
    })

    // Create Langfuse trace
    this.createAgentTrace()
  }

  private createAgentTrace() {
    createAgentTrace({
      traceId: this.traceId,
      agentName: 'ConsequenceTracker',
      projectId: this.config.projectId,
      episodeId: this.config.episodeId,
    })
  }

  static async create(
    modelName: string = 'openai:gpt-4o',
    options?: { traceId?: string; projectId?: string; episodeId?: string }
  ): Promise<ConsequenceAgent> {
    return new ConsequenceAgent(
      {
        modelName,
        traceId: options?.traceId,
        projectId: options?.projectId,
        episodeId: options?.episodeId,
      },
      CONSEQUENCE_TRACKER_PROMPT
    )
  }

  /**
   * Check story for continuity and causality
   */
  async checkCausality(
    goal: string,
    context: string,
    traceId?: string
  ): Promise<{ text: string; thinking?: string }> {
    const id = traceId || this.traceId

    return withSpan(
      id,
      'ConsequenceAgent.checkCausality',
      async span => {
        const prompt = `Goal: ${goal}\n\nContext:\n${context}`
        const response = await this.agent.generate(prompt, {
          tracingOptions: {
            traceId: id,
          },
        })

        const text = response.text
        const thinking =
          (response as any).reasoning ||
          (response as any).thinking ||
          (response as any).steps?.[0]?.thinking

        recordAgentGeneration(
          id,
          'ConsequenceTracker',
          { prompt, context: context.slice(0, 500) },
          { text, thinking },
          { model: this.config.modelName }
        )

        if (thinking) {
          recordAgentThinking(id, 'ConsequenceTracker', thinking)
        }

        return { text, thinking }
      },
      { projectId: this.config.projectId }
    )
  }

  /**
   * Validate content for continuity errors
   */
  async validateContinuity(
    beatId: string,
    context: string,
    traceId?: string
  ): Promise<{ text: string; thinking?: string }> {
    const id = traceId || this.traceId

    return withSpan(
      id,
      'ConsequenceAgent.validateContinuity',
      async span => {
        const prompt = `Validate continuity for beat ${beatId}\n\nContext:\n${context}`
        const response = await this.agent.generate(prompt, {
          tracingOptions: { traceId: id },
        })

        const text = response.text
        const thinking =
          (response as any).reasoning ||
          (response as any).thinking ||
          (response as any).steps?.[0]?.thinking

        recordAgentGeneration(
          id,
          'ConsequenceTracker',
          { prompt, context: context.slice(0, 500) },
          { text, thinking },
          { model: this.config.modelName }
        )
        return { text, thinking }
      },
      { projectId: this.config.projectId }
    )
  }
}

export async function createConsequenceAgent(
  modelName: string = 'openai:gpt-4o',
  options?: { traceId?: string; projectId?: string; episodeId?: string }
): Promise<ConsequenceAgent> {
  return ConsequenceAgent.create(modelName, options)
}
