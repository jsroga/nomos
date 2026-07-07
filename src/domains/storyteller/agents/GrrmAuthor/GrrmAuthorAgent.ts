/**
 * GrrmAuthorAgent - The Solo Creative Mind
 *
 * Single author agent replacing the 6-agent writers' room council.
 * Uses GrrmSystemPrompt for craft mechanics, Law of Motion, and script-beat output.
 *
 * Minimal tool surface: 9 GRRM CRUD tools (beat, character, episode, bible).
 * No workflow orchestration — that's handled by the beat-draft-workflow (P1-7).
 */

import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { v4 as uuidv4 } from 'uuid'
import { getMastraInstance, getStorageInstance } from '@/shared/agent-kernel'
import { grrmTools } from '@/domains/storyteller/agents/tools'
import { buildGrrmSystemPrompt } from '@/domains/storyteller/prompts/GrrmSystemPrompt'
import { getAgentModelConfig } from '@/domains/storyteller/config/ModelConfig'
import { withSpan } from '@/shared/observability/observability'

interface GrrmAuthorConfig {
  modelName?: string
  phase?: string
  projectContext?: string
  episodeContext?: string
}

export class GrrmAuthorAgent {
  private agent: Agent
  private toolsMap: Record<string, any>

  private constructor(config: GrrmAuthorConfig) {
    const m = getMastraInstance()
    const storage = getStorageInstance()
    const workspace = m?.getWorkspace()

    // Get model from config matrix
    const modelConfig = getAgentModelConfig('storyteller')
    const modelString = config.modelName || modelConfig.model.replace(':', '/')

    // Build GRRM system prompt with context
    const instructions = buildGrrmSystemPrompt({
      phase: config.phase,
      projectContext: config.projectContext,
      episodeContext: config.episodeContext,
    })

    // Use consolidated GRRM tools (9 total)
    const tools = grrmTools
    this.toolsMap = tools.reduce((acc, tool) => ({ ...acc, [tool.id]: tool }), {})

    // Configure memory for multi-turn conversation
    const memory = new Memory({
      storage,
      options: {
        lastMessages: 10, // Keep context manageable
      },
    })

    this.agent = new Agent({
      id: 'grrm-author',
      name: 'GRRM Author',
      instructions,
      model: modelString,
      tools: this.toolsMap,
      mastra: m,
      workspace,
      memory,
    })

    // Manually link observability
    ;(this.agent as Agent & { mastra: typeof m }).mastra = m
  }

  /**
   * Create a new GRRM Author agent instance
   */
  static async create(config: GrrmAuthorConfig = {}): Promise<GrrmAuthorAgent> {
    return new GrrmAuthorAgent(config)
  }

  /**
   * Generate a hex ID for OTEL compatibility
   */
  private generateHexId(length: number): string {
    return uuidv4().replace(/-/g, '').padEnd(length, '0').slice(0, length)
  }

  /**
   * Run the agent with a goal and context
   */
  async run(
    goal: string,
    context: string,
    traceId?: string,
    options?: { temperature?: number; topP?: number; toolChoice?: 'auto' | 'none' | 'required' }
  ): Promise<string> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)

    return withSpan(
      id,
      'GrrmAuthorAgent.run',
      async _span => {
        const prompt = `Goal: ${goal}\n\nContext:\n${context}`
        const response = await this.agent.generate(prompt, {
          toolChoice: options?.toolChoice || 'auto',
          maxSteps: 10,
          tracingOptions: {
            traceId: id,
            parentSpanId: spanId,
          },
        })
        return response.text
      },
      { goal, context, id: spanId }
    )
  }

  /**
   * Generate a story beat based on context
   */
  async generateBeat(
    context: {
      episodeId: string
      beatPlan?: Record<string, any>
      previousBeat?: string
      characters: string[]
    },
    traceId?: string
  ): Promise<string> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)

    return withSpan(
      id,
      'GrrmAuthorAgent.generateBeat',
      async _span => {
        const prompt = `Generate a script-format story beat for episode ${context.episodeId}.
${context.beatPlan ? `Beat plan: ${JSON.stringify(context.beatPlan)}` : ''}
${context.previousBeat ? `Previous beat: ${context.previousBeat}` : 'This is the opening beat.'}
Characters involved: ${context.characters.join(', ')}

Follow the Script Beat Format (§ GrrmSystemPrompt):
- Slugline (INT/EXT location)
- Action lines (max 2 per beat)
- Dialogue blocks with subtext notes
- Ensure Law of Motion fields: actionTaken, consequence, storyStateChange`

        return this.run('Generate script beat', prompt, id)
      },
      { ...context, id: spanId }
    )
  }

  /**
   * Self-critique a beat or scene
   */
  async critique(
    content: string,
    checkTypes: Array<'subtext' | 'state-change' | 'slop' | 'consequence'> = ['subtext', 'state-change', 'slop', 'consequence'],
    traceId?: string
  ): Promise<string> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)

    return withSpan(
      id,
      'GrrmAuthorAgent.critique',
      async _span => {
        const checkList = checkTypes.map(t => `- ${t}`).join('\n')
        const prompt = `Run self-critique checklist on the following content:

${checkList}

Content:
${content}

Use the Self-Critique Checklist (§ GrrmSystemPrompt IV). Be ruthless. List issues, don't rewrite.`

        return this.run('Self-critique', prompt, id)
      },
      { contentLength: content.length, checkTypes, id: spanId }
    )
  }

  /**
   * Stream response from the agent
   */
  stream(prompt: string, options?: any) {
    const traceId = options?.traceId || this.generateHexId(32)

    return this.agent.stream(prompt, {
      toolChoice: options?.toolChoice || 'auto',
      maxSteps: 10,
      tracingOptions: {
        traceId,
        ...(options?.parentSpanId ? { parentSpanId: options.parentSpanId } : {}),
      },
    })
  }

  /**
   * Execute a specific tool directly
   */
  async executeTool(
    toolId: string,
    args: Record<string, unknown>,
    traceId?: string
  ): Promise<string> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)
    const tool = this.toolsMap[toolId]

    if (!tool) {
      throw new Error(`Tool ${toolId} not found`)
    }

    return withSpan(
      id,
      `GrrmAuthorAgent.tool.${toolId}`,
      async _span => {
        const result = await tool.execute(args, {})
        return typeof result === 'string' ? result : JSON.stringify(result)
      },
      { toolId, args, id: spanId }
    )
  }
}

/**
 * Factory function for easy instantiation
 */
export async function createGrrmAuthorAgent(
  config: GrrmAuthorConfig = {}
): Promise<GrrmAuthorAgent> {
  return GrrmAuthorAgent.create(config)
}
