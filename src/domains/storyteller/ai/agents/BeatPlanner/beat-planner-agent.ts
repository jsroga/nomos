/**
 * BeatPlannerAgent - Beat Structure Planner
 *
 * Outputs beat plan JSON (goal, conflict, turn, dialogue hook) — NO prose
 * generation. Part of the StoryForge topology: the planner hands structure
 * to the GRRM Author, who writes the actual scene.
 *
 * Tools: only listBeatsTool and manageBeatTool.
 */

import '@/shared/data/server-guard'
import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { v4 as uuidv4 } from 'uuid'
import { getMastraInstance, getStorageInstance } from '@/shared/agent-kernel'
import { manageBeatTool, listBeatsTool } from '@/domains/storyteller/ai/tools'
import { resolveRoleModel, resolveStorytellerModel } from '@/domains/storyteller/config/constants/model-config'
import { buildBeatPlannerPrompt } from '@/domains/storyteller/ai/prompts/beat-planner-prompt'
import { withSpan } from '@/shared/observability/observability'
import {
  AgentModelRole,
  BeatPlannerAgentId,
  BeatPlannerAgentLabel,
  BeatPlannerAgentSpan,
  BeatPlannerCopy,
  ListSeparator,
} from '@/domains/storyteller/ai/constants/agent-identity'
import { StringSeparator } from '@/shared/data/constants/protocol'

import { BeatPlanSchema, type BeatPlan } from './beat-plan-schema'
export { BeatPlanSchema, type BeatPlan }

type PlannerTool = typeof listBeatsTool | typeof manageBeatTool

interface BeatPlannerConfig {
  modelName?: string
  episodeContext?: string
}

interface BeatPlannerStreamOptions {
  traceId?: string
  parentSpanId?: string
  toolChoice?: 'auto' | 'none' | 'required'
}

export class BeatPlannerAgent {
  private agent: Agent
  private toolsMap: Record<string, PlannerTool>

  private constructor(config: BeatPlannerConfig) {
    const m = getMastraInstance()
    const storage = getStorageInstance()
    const workspace = m?.getWorkspace()

    const model = config.modelName
      ? resolveStorytellerModel(config.modelName)
      : () => resolveRoleModel(AgentModelRole.Planner)

    // System prompt: planning only, no prose (shared with the stateless planner)
    const instructions = buildBeatPlannerPrompt(config.episodeContext)

    const tools: PlannerTool[] = [listBeatsTool, manageBeatTool]
    this.toolsMap = tools.reduce<Record<string, PlannerTool>>((acc, tool) => {
      acc[tool.id] = tool
      return acc
    }, {})

    const memory = new Memory({
      storage,
      options: {
        lastMessages: 10,
      },
    })

    this.agent = new Agent({
      id: BeatPlannerAgentId.BeatPlanner,
      name: BeatPlannerAgentLabel.BeatPlanner,
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

  static async create(config: BeatPlannerConfig = {}): Promise<BeatPlannerAgent> {
    return new BeatPlannerAgent(config)
  }

  /** Underlying Mastra Agent — for registration on the central instance. */
  get mastraAgent(): Agent {
    return this.agent
  }

  /** Generate a hex ID for OTEL compatibility */
  private generateHexId(length: number): string {
    return uuidv4().replace(/-/g, '').padEnd(length, '0').slice(0, length)
  }

  /** Plan the next beat (returns structured BeatPlan JSON). */
  async planNextBeat(
    context: {
      episodeId: string
      previousBeats?: string[]
      brief?: string
      targetEmotion?: string
      characters: string[]
    },
    traceId?: string
  ): Promise<BeatPlan> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)

    return withSpan(
      id,
      BeatPlannerAgentSpan.PlanNextBeat,
      async _span => {
        const prompt = `Plan the next beat for episode ${context.episodeId}.

${context.brief ? `Brief (what this beat must accomplish):\n${context.brief}\n` : ''}
${context.previousBeats && context.previousBeats.length > 0 ? `Previous beats:\n${context.previousBeats.join(StringSeparator.DoubleNewline)}` : BeatPlannerCopy.OpeningBeat}

Characters available: ${context.characters.join(ListSeparator.CommaSpace)}
${context.targetEmotion ? `Target emotion: ${context.targetEmotion}` : ''}

Output a beat plan with: goal, conflict, turn, dialogueHook, charactersInvolved.`

        const response = await this.agent.generate(prompt, {
          toolChoice: AgentModelRole.Auto,
          maxSteps: 5,
          structuredOutput: { schema: BeatPlanSchema },
          tracingOptions: {
            traceId: id,
            parentSpanId: spanId,
          },
        })

        const plan = BeatPlanSchema.safeParse(response.object)
        if (!plan.success) {
          throw new Error(`Beat planner returned an invalid plan: ${plan.error.message}`)
        }
        return plan.data
      },
      { episodeId: context.episodeId, characters: context.characters, id: spanId }
    )
  }

  /** Run the agent with a free-form planning request. */
  async run(goal: string, context: string, traceId?: string): Promise<string> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)

    return withSpan(
      id,
      BeatPlannerAgentSpan.Run,
      async _span => {
        const prompt = `Goal: ${goal}\n\nContext:\n${context}`
        const response = await this.agent.generate(prompt, {
          toolChoice: AgentModelRole.Auto,
          maxSteps: 5,
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

  /** Stream a response from the agent. */
  stream(prompt: string, options?: BeatPlannerStreamOptions) {
    const traceId = options?.traceId || this.generateHexId(32)

    return this.agent.stream(prompt, {
      toolChoice: options?.toolChoice || AgentModelRole.Auto,
      maxSteps: 5,
      tracingOptions: {
        traceId,
        ...(options?.parentSpanId ? { parentSpanId: options.parentSpanId } : {}),
      },
    })
  }
}

/** Factory function for easy instantiation */
export async function createBeatPlannerAgent(
  config: BeatPlannerConfig = {}
): Promise<BeatPlannerAgent> {
  return BeatPlannerAgent.create(config)
}
