/**
 * Self-Critique Agent - Mastra Implementation
 *
 * Dedicated agent for "Deep Mode" critique.
 * Only called when explicitly requested to save tokens.
 */

import { Agent } from '@mastra/core/agent'
import {
  createAgentTrace,
  recordAgentGeneration,
  withSpan,
} from '../../../../agent-core/observability'
import { createMastraTraceId, getWorkflowTraceId } from '../../utils/workflow-context'
import {
  SELF_CRITIQUE_PROMPT,
  GRRM_GILLIGAN_STANDARDS,
  CREATIVE_EXAMPLES,
} from '../../prompts/extended-thinking'
import { getMastraInstance } from './mastra-instance'

interface SelfCritiqueConfig {
  modelName: string
  traceId?: string
  projectId?: string
  episodeId?: string
}

export class SelfCritiqueAgent {
  private agent: Agent
  private traceId: string
  private config: SelfCritiqueConfig

  private constructor(config: SelfCritiqueConfig, instructions: string) {
    this.config = config
    this.traceId = config.traceId || getWorkflowTraceId() || createMastraTraceId()

    const m = getMastraInstance()
    const modelString = config.modelName.replace(':', '/')

    this.agent = new Agent({
      id: 'self-critique-agent',
      name: 'Story Editor',
      instructions,
      model: modelString,
      mastra: m,
    })

    this.createAgentTrace()
  }

  private createAgentTrace() {
    createAgentTrace({
      traceId: this.traceId,
      agentName: 'SelfCritique',
      projectId: this.config.projectId,
      episodeId: this.config.episodeId,
    })
  }

  static async create(
    modelName: string = 'openai:gpt-4o',
    options?: { traceId?: string; projectId?: string; episodeId?: string }
  ): Promise<SelfCritiqueAgent> {
    const instructions = `
You are a ruthless Story Editor.
${GRRM_GILLIGAN_STANDARDS}

${CREATIVE_EXAMPLES}

Your job is to catch "AI SLOP" and generic writing.
If a draft is good, say it's good. Don't invent problems.
`
    return new SelfCritiqueAgent(
      {
        modelName,
        traceId: options?.traceId,
        projectId: options?.projectId,
        episodeId: options?.episodeId,
      },
      instructions
    )
  }

  /**
   * Deeply critique a draft
   */
  async critique(
    draft: string,
    context: string,
    traceId?: string
  ): Promise<{
    score: number
    issue: string
    fix: string
    shouldRevise: boolean
  }> {
    const id = traceId || this.traceId

    return withSpan(
      id,
      'SelfCritiqueAgent.critique',
      async span => {
        const prompt = SELF_CRITIQUE_PROMPT.replace('{{draft}}', draft).replace(
          '{{context}}',
          context
        )

        const response = await this.agent.generate(prompt)
        const text = response.text

        // Log for observability
        recordAgentGeneration(
          id,
          'SelfCritique',
          {
            prompt: `Critique Request (Draft length: ${draft.length} chars)`,
            context: draft.slice(0, 100),
          },
          { text },
          { model: this.config.modelName }
        )

        try {
          // Parse JSON response
          // Handle potential markdown wrapping ```json ... ```
          const cleanText = text.replace(/```json\n?|\n?```/g, '').trim()
          return JSON.parse(cleanText)
        } catch (e) {
          console.error('Failed to parse critique JSON', e)
          return {
            score: 50,
            issue: 'JSON Parse Error',
            fix: 'Manual review required',
            shouldRevise: true,
          }
        }
      },
      { draftLength: draft.length }
    )
  }
}

export async function createSelfCritiqueAgent(
  modelName: string = 'openai:gpt-4o',
  options?: { traceId?: string; projectId?: string; episodeId?: string }
): Promise<SelfCritiqueAgent> {
  return SelfCritiqueAgent.create(modelName, options)
}
