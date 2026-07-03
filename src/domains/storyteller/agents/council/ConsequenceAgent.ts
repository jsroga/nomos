import { Agent } from '@mastra/core/agent'
import {
  createAgentTrace,
  recordAgentGeneration,
  recordAgentThinking,
  withSpan,
} from '@/agent-core/observability'
import { extractThinking, truncateForTrace } from '@/agent-core/agents/agent-response'
import { createMastraTraceId, getWorkflowTraceId } from '@/domains/storyteller/agents/orchestration/WorkflowContext'
import { CONSEQUENCE_TRACKER_PROMPT } from '@/domains/storyteller/prompts/personas/consequence-tracker'
import { checkContinuityTool, quickConsistencyCheckTool } from '@/domains/storyteller/agents/tools'
import { getMastraInstance } from '@/shared/agent-kernel'
import { AGENT_RUNTIME_DEFAULTS } from '@/domains/storyteller/config/ModelConfig'

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
    this.traceId = config.traceId || getWorkflowTraceId() || createMastraTraceId()

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
    modelName: string = AGENT_RUNTIME_DEFAULTS.model,
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
      async _span => {
        const prompt = `Goal: ${goal}\n\nContext:\n${context}`
        const response = await this.agent.generate(prompt, {
          tracingOptions: {
            traceId: id,
          },
        })

        const text = response.text
        const thinking = extractThinking(response)

        recordAgentGeneration(
          id,
          'ConsequenceTracker',
          { prompt, context: truncateForTrace(context) },
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
      async _span => {
        const prompt = `Validate continuity for beat ${beatId}\n\nContext:\n${context}`
        const response = await this.agent.generate(prompt, {
          tracingOptions: { traceId: id },
        })

        const text = response.text
        const thinking = extractThinking(response)

        recordAgentGeneration(
          id,
          'ConsequenceTracker',
          { prompt, context: truncateForTrace(context) },
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
  modelName: string = AGENT_RUNTIME_DEFAULTS.model,
  options?: { traceId?: string; projectId?: string; episodeId?: string }
): Promise<ConsequenceAgent> {
  return ConsequenceAgent.create(modelName, options)
}
