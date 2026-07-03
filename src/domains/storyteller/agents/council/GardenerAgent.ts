import { Agent } from '@mastra/core/agent'
import {
  createAgentTrace,
  recordAgentGeneration,
  recordAgentThinking,
  withSpan,
} from '@/agent-core/observability'
import { createMastraTraceId, getWorkflowTraceId } from '@/domains/storyteller/agents/orchestration/WorkflowContext'
import { WRITER_STRUCTURED_PROMPT } from '@/domains/storyteller/prompts/personas/writer'
import {
  improveDialogueTool,
  addVisualHookTool,
  condenseSceneTool,
  regenerateTextTool,
  selfCritiqueTool,
} from '@/domains/storyteller/agents/tools'
import { extractThinking, truncateForTrace } from '@/agent-core/agents/agent-response'
import { getMastraInstance } from '@/shared/agent-kernel'
import { AGENT_RUNTIME_DEFAULTS } from '@/domains/storyteller/config/ModelConfig'

interface GardenerConfig {
  modelName: string
  traceId?: string
  projectId?: string
  episodeId?: string
}

export class GardenerAgent {
  private agent: Agent
  private toolsMap: Record<string, unknown>
  private traceId: string
  private config: GardenerConfig

  private constructor(config: GardenerConfig, instructions: string) {
    this.config = config
    this.traceId = config.traceId || getWorkflowTraceId() || createMastraTraceId()

    const tools = [
      selfCritiqueTool,
      improveDialogueTool,
      addVisualHookTool,
      condenseSceneTool,
      regenerateTextTool,
    ]

    this.toolsMap = tools.reduce((acc, tool) => ({ ...acc, [tool.id]: tool }), {})

    const m = getMastraInstance()
    // Use string model identifier for Mastra AI SDK v5 compatibility
    const modelString = config.modelName.replace(':', '/')

    this.agent = new Agent({
      id: 'gardener',
      name: 'The Gardener',
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
      agentName: 'Gardener',
      projectId: this.config.projectId,
      episodeId: this.config.episodeId,
    })
  }

  static async create(
    modelName: string = AGENT_RUNTIME_DEFAULTS.model,
    options?: { traceId?: string; projectId?: string; episodeId?: string }
  ): Promise<GardenerAgent> {
    return new GardenerAgent(
      {
        modelName,
        traceId: options?.traceId,
        projectId: options?.projectId,
        episodeId: options?.episodeId,
      },
      WRITER_STRUCTURED_PROMPT
    )
  }

  /**
   * Write or expand a scene
   */
  async writeScene(
    goal: string,
    context: string,
    traceId?: string
  ): Promise<{ text: string; thinking?: string }> {
    const id = traceId || this.traceId

    return withSpan(
      id,
      'GardenerAgent.writeScene',
      async _span => {
        const prompt = `Goal: ${goal}\n\nContext:\n${context}`
        const response = await this.agent.generate(prompt, {
          maxSteps: AGENT_RUNTIME_DEFAULTS.maxSteps,
          tracingOptions: {
            traceId: id,
          },
        })
        const text = response.text
        const thinking = extractThinking(response)

        recordAgentGeneration(
          id,
          'Gardener',
          { prompt, context: truncateForTrace(context) },
          { text, thinking },
          { model: this.config.modelName }
        )

        if (thinking) {
          recordAgentThinking(id, 'Gardener', thinking)
        }

        return { text, thinking }
      },
      { projectId: this.config.projectId }
    )
  }

  /**
   * Optimize prose style ("Show, Don't Tell")
   */
  async optimizeProse(
    draft: string,
    traceId?: string
  ): Promise<{ text: string; thinking?: string }> {
    const id = traceId || this.traceId

    return withSpan(
      id,
      'GardenerAgent.optimizeProse',
      async _span => {
        const prompt = `Optimize the following prose:\n\n${draft}`
        const response = await this.agent.generate(prompt, {
          tracingOptions: { traceId: id },
        })

        const text = response.text
        const thinking = extractThinking(response)

        recordAgentGeneration(
          id,
          'Gardener',
          { prompt, context: truncateForTrace(draft) },
          { text, thinking },
          { model: this.config.modelName }
        )
        return { text, thinking }
      },
      { projectId: this.config.projectId }
    )
  }
}

export async function createGardenerAgent(
  modelName: string = AGENT_RUNTIME_DEFAULTS.model,
  options?: { traceId?: string; projectId?: string; episodeId?: string }
): Promise<GardenerAgent> {
  return GardenerAgent.create(modelName, options)
}
