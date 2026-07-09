/**
 * GrrmAuthorAgent - The Solo Creative Mind
 *
 * Single author agent replacing the 6-agent writers' room council.
 * Uses GrrmSystemPrompt for craft mechanics, Law of Motion, and script-beat
 * output. The same author drafts AND revises (unified vision) — critics only
 * diagnose (see agents/critics/).
 *
 * Minimal tool surface: the 9 GRRM CRUD tools (beat, character, episode,
 * bible). Orchestration lives in agents/workflows/beat-draft-workflow.ts.
 */

import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { v4 as uuidv4 } from 'uuid'
import { getMastraInstance, getStorageInstance } from '@/shared/agent-kernel'
import { grrmTools } from '@/domains/storyteller/agents/tools'
import { buildGrrmSystemPrompt } from '@/domains/storyteller/prompts/GrrmSystemPrompt'
import type { RequestContext } from '@mastra/core/di'
import { resolveRoleModel, resolveStorytellerModel } from '@/domains/storyteller/config/ModelConfig'
import {
  STORYTELLER_AUTHOR_MODEL,
  requestContextString,
} from '@/domains/storyteller/agents/request-context'
import { withSpan } from '@/shared/observability/observability'
import type { BeatPlan } from '@/domains/storyteller/agents/BeatPlanner/beat-plan-schema'

type GrrmTool = (typeof grrmTools)[number]

interface GrrmAuthorConfig {
  modelName?: string
  phase?: string
  projectContext?: string
  episodeContext?: string
}

interface GrrmAuthorRunOptions {
  toolChoice?: 'auto' | 'none' | 'required'
  maxSteps?: number
}

interface GrrmAuthorStreamOptions extends GrrmAuthorRunOptions {
  traceId?: string
  parentSpanId?: string
}

export class GrrmAuthorAgent {
  private agent: Agent
  private toolsMap: Record<string, GrrmTool>

  private constructor(config: GrrmAuthorConfig) {
    const m = getMastraInstance()
    const storage = getStorageInstance()
    const workspace = m?.getWorkspace()

    // Explicit modelName (CLI/testing) beats everything; otherwise the picker
    // choice from RequestContext overrides the author default per request.
    const model = config.modelName
      ? resolveStorytellerModel(config.modelName)
      : ({ requestContext }: { requestContext: RequestContext }) =>
          resolveRoleModel('author', requestContextString(requestContext, STORYTELLER_AUTHOR_MODEL))

    const instructions = buildGrrmSystemPrompt({
      phase: config.phase,
      projectContext: config.projectContext,
      episodeContext: config.episodeContext,
    })

    this.toolsMap = grrmTools.reduce<Record<string, GrrmTool>>((acc, tool) => {
      acc[tool.id] = tool
      return acc
    }, {})

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
      model,
      tools: this.toolsMap,
      mastra: m,
      workspace,
      memory,
    })

    // Manually link observability (extends the agent with a mastra ref)
    Object.assign(this.agent, { mastra: m })
  }

  static async create(config: GrrmAuthorConfig = {}): Promise<GrrmAuthorAgent> {
    return new GrrmAuthorAgent(config)
  }

  /** Underlying Mastra Agent — for registration on the central instance. */
  get mastraAgent(): Agent {
    return this.agent
  }

  /** Generate a hex ID for OTEL compatibility */
  private generateHexId(length: number): string {
    return uuidv4().replace(/-/g, '').padEnd(length, '0').slice(0, length)
  }

  /** Run the agent with a goal and context. */
  async run(
    goal: string,
    context: string,
    traceId?: string,
    options?: GrrmAuthorRunOptions
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
          maxSteps: options?.maxSteps ?? 10,
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

  /** Draft a script-format story beat from a beat plan. */
  async generateBeat(
    context: {
      episodeId: string
      beatPlan?: BeatPlan
      previousBeat?: string
      characters: string[]
    },
    traceId?: string,
    options?: GrrmAuthorRunOptions
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

        return this.run('Generate script beat', prompt, id, options)
      },
      { episodeId: context.episodeId, characters: context.characters, id: spanId }
    )
  }

  /** Stream a response from the agent. */
  stream(prompt: string, options?: GrrmAuthorStreamOptions) {
    const traceId = options?.traceId || this.generateHexId(32)

    return this.agent.stream(prompt, {
      toolChoice: options?.toolChoice || 'auto',
      maxSteps: options?.maxSteps ?? 10,
      tracingOptions: {
        traceId,
        ...(options?.parentSpanId ? { parentSpanId: options.parentSpanId } : {}),
      },
    })
  }
}

/** Factory function for easy instantiation */
export async function createGrrmAuthorAgent(
  config: GrrmAuthorConfig = {}
): Promise<GrrmAuthorAgent> {
  return GrrmAuthorAgent.create(config)
}
