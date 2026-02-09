import { Agent } from '@mastra/core/agent'
import { v4 as uuidv4 } from 'uuid'
import {
  createAgentTrace,
  recordAgentGeneration,
  recordAgentThinking,
  withSpan,
} from '../../../../agent-core/observability'
import { getWorkflowTraceId } from '../../utils/workflow-context'
import { CHARACTER_PSYCHOLOGY_PROMPT } from '../../prompts/agents/character-psychology'
import { analyzePsychologyTool, simulateReactionTool, assessRelationshipTool } from '../../tools/v2'
import { getMastraInstance } from './mastra-instance'

interface PsychologistConfig {
  modelName: string
  traceId?: string
  projectId?: string
  episodeId?: string
}

export class PsychologistAgent {
  private agent: Agent
  private toolsMap: Record<string, unknown>
  private traceId: string
  private config: PsychologistConfig

  private constructor(config: PsychologistConfig, instructions: string) {
    this.config = config
    this.traceId = config.traceId || getWorkflowTraceId() || uuidv4()

    const tools = [analyzePsychologyTool, simulateReactionTool, assessRelationshipTool]

    this.toolsMap = tools.reduce((acc, tool) => ({ ...acc, [tool.id]: tool }), {})

    const m = getMastraInstance()
    // Use string model identifier for Mastra AI SDK v5 compatibility
    const modelString = config.modelName.replace(':', '/')

    this.agent = new Agent({
      id: 'psychologist-agent',
      name: 'Psychologist Agent',
      instructions,
      model: modelString,
      tools: this.toolsMap,
      mastra: m,
    })

    // Create Langfuse trace for this agent
    this.createAgentTrace()
  }

  /**
   * Create a Langfuse trace for this agent instance
   */
  private createAgentTrace() {
    createAgentTrace({
      traceId: this.traceId,
      agentName: 'Psychologist',
      projectId: this.config.projectId,
      episodeId: this.config.episodeId,
    })
  }

  static async create(
    modelName: string = 'openai:gpt-4o',
    options?: { traceId?: string; projectId?: string; episodeId?: string }
  ): Promise<PsychologistAgent> {
    return new PsychologistAgent(
      {
        modelName,
        traceId: options?.traceId,
        projectId: options?.projectId,
        episodeId: options?.episodeId,
      },
      CHARACTER_PSYCHOLOGY_PROMPT
    )
  }

  /**
   * Analyze a character profile or interaction
   */
  async analyzeProfile(
    name: string,
    context: string,
    traceId?: string
  ): Promise<{ text: string; thinking?: string }> {
    const id = traceId || this.traceId

    return withSpan(
      id,
      'PsychologistAgent.analyzeProfile',
      async span => {
        const prompt = `Analyze character: ${name}\n\nContext:\n${context}`
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
          'Psychologist',
          { prompt, context: context.slice(0, 500) },
          { text, thinking },
          { model: this.config.modelName }
        )

        if (thinking) {
          recordAgentThinking(id, 'Psychologist', thinking)
        }

        return { text, thinking }
      },
      { projectId: this.config.projectId }
    )
  }
  /**
   * Simulate a character's reaction to an event
   */
  async simulateReaction(
    name: string,
    event: string,
    context: string,
    traceId?: string
  ): Promise<{ text: string; thinking?: string }> {
    const id = traceId || this.traceId

    return withSpan(
      id,
      'PsychologistAgent.simulateReaction',
      async span => {
        const prompt = `Simulate reaction for character: ${name}\nEvent: ${event}\n\nContext:\n${context}`
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
          'Psychologist',
          { prompt, context: context.slice(0, 500) },
          { text, thinking },
          { model: this.config.modelName }
        )
        return { text, thinking }
      },
      { projectId: this.config.projectId }
    )
  }

  /**
   * Assess relationship dynamics between characters
   */
  async assessRelationship(
    char1: string,
    char2: string,
    history: string[],
    traceId?: string
  ): Promise<{ text: string; thinking?: string }> {
    const id = traceId || this.traceId

    return withSpan(
      id,
      'PsychologistAgent.assessRelationship',
      async span => {
        const prompt = `Assess relationship between ${char1} and ${char2}\nHistory:\n${history.join('\n')}`
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
          'Psychologist',
          { prompt, context: history.join('\n').slice(0, 500) },
          { text, thinking },
          { model: this.config.modelName }
        )
        return { text, thinking }
      },
      { projectId: this.config.projectId }
    )
  }
}

export async function createPsychologistAgent(
  modelName: string = 'openai:gpt-4o',
  options?: { traceId?: string; projectId?: string; episodeId?: string }
): Promise<PsychologistAgent> {
  return PsychologistAgent.create(modelName, options)
}
