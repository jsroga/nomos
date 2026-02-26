/**
 * Devil's Advocate Agent - Mastra Implementation with Full Langfuse Tracing
 *
 * The adversarial critic that challenges the story for clichés and plot holes.
 */

import { Agent } from '@mastra/core/agent'
import {
  createAgentTrace,
  recordAgentGeneration,
  recordAgentThinking,
  withSpan,
} from '../../../../agent-core/observability'
import { createMastraTraceId, getWorkflowTraceId } from '../../utils/workflow-context'
import { DEVILS_ADVOCATE_PROMPT } from '../../prompts/agents/devils-advocate'
import { getMastraInstance } from './mastra-instance'

// Import Script Tools for suggestions
import { improveDialogueTool, shiftToneTool } from '../../tools/v2'

interface DevilsAdvocateConfig {
  modelName: string
  traceId?: string
  projectId?: string
  episodeId?: string
}

export class DevilsAdvocateAgent {
  private agent: Agent
  private toolsMap: Record<string, unknown>
  private traceId: string
  private config: DevilsAdvocateConfig

  private constructor(config: DevilsAdvocateConfig, instructions: string) {
    this.config = config
    this.traceId = config.traceId || getWorkflowTraceId() || createMastraTraceId()

    const tools = [improveDialogueTool, shiftToneTool]

    this.toolsMap = tools.reduce((acc, tool) => ({ ...acc, [tool.id]: tool }), {})

    const m = getMastraInstance()
    // Use string model identifier for Mastra AI SDK v5 compatibility
    const modelString = config.modelName.replace(':', '/')

    this.agent = new Agent({
      id: 'devils-advocate',
      name: 'Devil\'s Advocate',
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
      agentName: 'DevilsAdvocate',
      projectId: this.config.projectId,
      episodeId: this.config.episodeId,
    })
  }

  getTraceId(): string {
    return this.traceId
  }

  static async create(
    modelName: string = 'openai:gpt-4o',
    options?: { traceId?: string; projectId?: string; episodeId?: string }
  ): Promise<DevilsAdvocateAgent> {
    return new DevilsAdvocateAgent(
      {
        modelName,
        traceId: options?.traceId,
        projectId: options?.projectId,
        episodeId: options?.episodeId,
      },
      DEVILS_ADVOCATE_PROMPT
    )
  }

  /**
   * Critique a beat or scene
   */
  async critique(
    content: string,
    context: string,
    traceId?: string
  ): Promise<{ text: string; thinking?: string }> {
    const id = traceId || this.traceId

    return withSpan(
      id,
      'DevilsAdvocateAgent.critique',
      async span => {
        const prompt = `Critique this story beat/scene.
Content:
${content}

Context:
${context}

Be brutal. Identify clichés and logical failures.`

        const response = await this.agent.generate(prompt)
        const text = response.text
        const thinking = (response as any).reasoning || (response as any).thinking

        recordAgentGeneration(
          id,
          'DevilsAdvocate',
          { prompt, context },
          { text, thinking },
          { model: this.config.modelName }
        )

        if (thinking) {
          recordAgentThinking(id, 'DevilsAdvocate', thinking)
        }

        return { text, thinking }
      },
      { content: content.slice(0, 200) }
    )
  }
}

export async function createDevilsAdvocateAgent(
  modelName: string = 'openai:gpt-4o',
  options?: { traceId?: string; projectId?: string; episodeId?: string }
): Promise<DevilsAdvocateAgent> {
  return DevilsAdvocateAgent.create(modelName, options)
}
