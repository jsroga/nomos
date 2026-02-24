import { Agent } from '@mastra/core/agent'
import { v4 as uuidv4 } from 'uuid'
import {
  createAgentTrace,
  recordAgentGeneration,
  recordAgentThinking,
  withSpan,
} from '../../../../agent-core/observability'
import { getWorkflowTraceId } from '../../utils/workflow-context'
import { WRITER_STRUCTURED_PROMPT } from '../../prompts/agents/writer'
import {
  improveDialogueTool,
  addVisualHookTool,
  condenseSceneTool,
  regenerateTextTool,
  selfCritiqueTool,
} from '../../tools/v2'
import { getMastraInstance } from './mastra-instance'

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
    this.traceId = config.traceId || getWorkflowTraceId() || uuidv4()

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
    modelName: string = 'openai:gpt-4o-mini',
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
      async span => {
        const prompt = `Goal: ${goal}\n\nContext:\n${context}`
        const response = await this.agent.generate(prompt, {
          maxSteps: 10,
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
          'Gardener',
          { prompt, context: context.slice(0, 500) },
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
      async span => {
        const prompt = `Optimize the following prose:\n\n${draft}`
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
          'Gardener',
          { prompt, context: draft.slice(0, 500) },
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
  modelName: string = 'openai:gpt-4o',
  options?: { traceId?: string; projectId?: string; episodeId?: string }
): Promise<GardenerAgent> {
  return GardenerAgent.create(modelName, options)
}
