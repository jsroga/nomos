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

import { meteredCall } from '@/shared/ai/gateway/agent'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import '@/shared/data/server-guard'
import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { v4 as uuidv4 } from 'uuid'
import { getMastraInstance, getStorageInstance } from '@/shared/agent-kernel'
import { grrmTools } from '@/domains/storyteller/ai/tools'
import { buildGrrmSystemPrompt } from '@/domains/storyteller/ai/prompts/grrm-system-prompt'
import type { RequestContext } from '@mastra/core/di'
import { resolveRoleModel, resolveStorytellerModel } from '@/domains/storyteller/config/constants/model-config'
import {
  STORYTELLER_AUTHOR_MODEL,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'
import { withMastraSpan } from '@/shared/observability/mastra-tracing'
import type { BeatPlan } from '@/domains/storyteller/ai/agents/BeatPlanner/beat-plan-schema'
import {
  AgentModelRole,
  GrrmAuthorAgentId,
  GrrmAuthorAgentLabel,
  GrrmAuthorAgentSpan,
  GrrmAuthorCopy,
  ListSeparator,
} from '@/domains/storyteller/ai/constants/agent-identity'

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
          resolveRoleModel(AgentModelRole.Author, requestContextString(requestContext, STORYTELLER_AUTHOR_MODEL))

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
      id: GrrmAuthorAgentId.GrrmAuthor,
      name: GrrmAuthorAgentLabel.GrrmAuthor,
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

    return withMastraSpan(
      id,
      GrrmAuthorAgentSpan.Run,
      async span => {
        const prompt = `Goal: ${goal}\n\nContext:\n${context}`
        // Nest the generate span under this operation span explicitly (real span id).
        const response = await meteredCall(LlmFeature.StorytellerBeatPlan, () => this.agent.generate(prompt, {
          toolChoice: options?.toolChoice || AgentModelRole.Auto,
          maxSteps: options?.maxSteps ?? 10,
          tracingOptions: {
            traceId: id,
            ...(span.spanId ? { parentSpanId: span.spanId } : {}),
          },
        }))
        return response.text
      },
      { goal, context }
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

    return withMastraSpan(
      id,
      GrrmAuthorAgentSpan.GenerateBeat,
      async _span => {
        const prompt = `Generate a script-format story beat for episode ${context.episodeId}.
${context.beatPlan ? `Beat plan: ${JSON.stringify(context.beatPlan)}` : ''}
${context.previousBeat ? `Previous beat: ${context.previousBeat}` : GrrmAuthorCopy.OpeningBeat}
Characters involved: ${context.characters.join(ListSeparator.CommaSpace)}

Follow the Script Beat Format (§ GrrmSystemPrompt):
- Slugline (INT/EXT location)
- Action lines (max 2 per beat)
- Dialogue blocks with subtext notes
- Ensure Law of Motion fields: actionTaken, consequence, storyStateChange`

        return this.run(GrrmAuthorCopy.GenerateScriptBeat, prompt, id, options)
      },
      { episodeId: context.episodeId, characters: context.characters }
    )
  }

  /** Stream a response from the agent. */
  stream(prompt: string, options?: GrrmAuthorStreamOptions) {
    const traceId = options?.traceId || this.generateHexId(32)

    return this.agent.stream(prompt, {
      toolChoice: options?.toolChoice || AgentModelRole.Auto,
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
