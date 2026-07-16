/**
 * StorytellerAgent - Mastra Implementation
 *
 * Core agent for story writing, extending ExecutiveAgent with
 * specialized storyteller tools and prompts.
 *
 * Uses Mastra Memory for multi-turn conversation context.
 * See: https://mastra.ai/docs/agents/agent-memory
 */

import '@/shared/data/server-guard'
import { Agent } from '@mastra/core/agent'
import { Mastra } from '@mastra/core/mastra'
import type { RequestContext } from '@mastra/core/di'
import { Memory } from '@mastra/memory'
import { promptRepository } from '@/shared/agent-kernel/prompts/repository'
import { registerCorePrompts } from '@/shared/agent-kernel/prompts/registry'
import { withSpan } from '@/shared/observability/observability'
import { v4 as uuidv4 } from 'uuid'
import { getMastraInstance, getStorageInstance } from '@/shared/agent-kernel'
import {
  AGENT_RUNTIME_DEFAULTS,
  resolveRoleModel,
  resolveStorytellerModel,
} from '@/domains/storyteller/config/constants/model-config'

// Import consolidated GRRM tools (9 CRUD) + the workflow entry tool (#10)
import { grrmTools, runBeatDraftWorkflowTool } from '@/domains/storyteller/ai/tools'
import { getEntityLinkRequirements } from '@/domains/storyteller/config/storyteller-config'
import { buildChatAdapterPrompt } from '@/domains/storyteller/ai/prompts/chat-adapter-prompt'
import {
  AgentModelRole,
  BeatPlannerCopy,
  StorytellerAgentId,
  StorytellerAgentLabel,
  StorytellerAgentSpan,
  StorytellerSystemPromptId,
  ListSeparator,
} from '@/domains/storyteller/ai/constants/agent-identity'

interface StorytellerConfig {
  /** Explicit model for CLI/testing; when omitted the fixed 'chat' role slot applies. */
  modelName?: string
  mastra?: Mastra
}

type ChatTool = (typeof grrmTools)[number] | typeof runBeatDraftWorkflowTool

export class StorytellerAgent {
  private agent: Agent
  private toolsMap: Record<string, ChatTool>

  private constructor(config: StorytellerConfig, instructions: string) {
    // 9 GRRM CRUD tools + the single workflow entry tool (chat adapter only —
    // the author inside the workflow never gets this tool; recursion guard)
    const tools: ChatTool[] = [...grrmTools, runBeatDraftWorkflowTool]

    // Store tools for direct execution
    this.toolsMap = tools.reduce<Record<string, ChatTool>>((acc, tool) => {
      acc[tool.id] = tool
      return acc
    }, {})

    const m = getMastraInstance()
    const storage = getStorageInstance()

    // Get workspace from Mastra instance to ensure skills are loaded
    const workspace = m?.getWorkspace()

    // The chat adapter runs on the fixed 'chat' role slot (D2): the picker
    // drives the AUTHOR via RequestContext, never this glue agent. An explicit
    // modelName (CLI/testing) still wins.
    const model = config.modelName
      ? resolveStorytellerModel(config.modelName)
      : () => resolveRoleModel(AgentModelRole.Chat)

    // Configure memory for multi-turn conversation context
    // See: https://mastra.ai/docs/agents/agent-memory
    const memory = new Memory({
      storage,
      options: {
        lastMessages: 10, // Keep last 10 messages — 50 was burning tokens
      },
    })

    this.agent = new Agent({
      id: StorytellerAgentId.Storyteller,
      name: StorytellerAgentLabel.Storyteller,
      instructions,
      model,
      tools: this.toolsMap,
      mastra: m,
      workspace, // Pass workspace to enable skills and filesystem tools
      memory, // Enable memory for conversation context
    })

      // Manually link observability (extends the agent with a mastra ref)
      Object.assign(this.agent, { mastra: m })
  }

  static async create(modelName?: string): Promise<StorytellerAgent> {
    registerCorePrompts()

    // Thin chat-adapter prompt: conversation + world-bible upkeep + delegation
    // to the beat-draft workflow. Craft mechanics live in GrrmSystemPrompt
    // (the author inside the workflow), never here.
    const instructions = buildChatAdapterPrompt(getEntityLinkRequirements())

    // Register/refresh in the prompt repository (observability + reuse)
    promptRepository.register({
      name: StorytellerSystemPromptId.StorytellerSystem,
      version: 2,
      variables: [],
      text: instructions,
    })

    const m = getMastraInstance()
    return new StorytellerAgent({ modelName, mastra: m }, instructions)
  }

  /**
   * Generate a hex ID for OTEL compatibility
   */
  private generateHexId(length: number): string {
    return uuidv4().replace(/-/g, '').padEnd(length, '0').slice(0, length)
  }

  /**
   * Run the agent with a goal and context
   * @param goal - The goal for the agent
   * @param context - Context for the agent
   * @param traceId - Optional trace ID for observability
   * @param toolChoice - Tool choice mode
   * @param options - Additional generation options (temperature, topP)
   */
  async run(
    goal: string,
    context: string,
    traceId?: string,
    toolChoice: 'auto' | 'none' | 'required' = AgentModelRole.Auto,
    _options?: { temperature?: number; topP?: number }
  ): Promise<string> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)

    return withSpan(
      id,
      StorytellerAgentSpan.Run,
      async _span => {
        const prompt = `Goal: ${goal}\n\nContext:\n${context}`
        const response = await this.agent.generate(prompt, {
          toolChoice,
          maxSteps: AGENT_RUNTIME_DEFAULTS.maxSteps,
          tracingOptions: {
            traceId: id,
            parentSpanId: spanId,
          },
        })
        return response.text
      },
      { goal, context, id: spanId }
    ) // Pass id: spanId in metadata to force span ID
  }

  /**
   * Generate a story beat based on context
   */
  async generateBeat(
    context: {
      episodeId: string
      previousBeat?: string
      targetEmotion?: string
      characters: string[]
    },
    traceId?: string
  ): Promise<string> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)

    return withSpan(
      id,
      StorytellerAgentSpan.GenerateBeat,
      async _span => {
        const prompt = `Generate a new story beat for episode ${context.episodeId}.
${context.previousBeat ? `Previous beat: ${context.previousBeat}` : BeatPlannerCopy.OpeningBeat}
${context.targetEmotion ? `Target emotional tone: ${context.targetEmotion}` : ''}
Characters involved: ${context.characters.join(ListSeparator.CommaSpace)}

Create a beat with:
- A compelling logline
- Visual hook
- Clear emotional stakes
- Character advancement`

        return this.run(BeatPlannerCopy.GenerateStoryBeat, prompt, id)
      },
      { ...context, id: spanId }
    )
  }

  /**
   * Check story for continuity issues
   */
  async checkStoryContinuity(beatBoard: unknown[], traceId?: string): Promise<string> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)

    return withSpan(
      id,
      StorytellerAgentSpan.CheckStoryContinuity,
      async _span => {
        return this.run(
          BeatPlannerCopy.CheckStoryContinuity,
          `Review the beat board for continuity issues. There are ${beatBoard.length} beats to check.`,
          id
        )
      },
      { beatCount: beatBoard.length, id: spanId }
    )
  }

  /**
   * Suggest relationship dynamics between characters
   */
  async analyzeCharacterDynamics(
    character1: string,
    character2: string,
    traceId?: string
  ): Promise<string> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)

    return withSpan(
      id,
      StorytellerAgentSpan.AnalyzeCharacterDynamics,
      async _span => {
        return this.run(
          BeatPlannerCopy.AnalyzeCharacterDynamics,
          `Analyze the relationship between ${character1} and ${character2}. Consider their goals, fears, and emotional states.`,
          id
        )
      },
      { character1, character2, id: spanId }
    )
  }

  /**
   * Stream response from the agent
   */
  stream(prompt: string, options?: {
    traceId?: string
    parentSpanId?: string
    toolChoice?: 'auto' | 'none' | 'required'
    /** Server-trusted per-request values (IDs, author model) — see agents/request-context. */
    requestContext?: RequestContext
  }) {
    // Use stream() with v2 models (specificationVersion = 'v2' set in createModel)
    const traceId = options?.traceId || this.generateHexId(32)

    return this.agent.stream(prompt, {
      toolChoice: options?.toolChoice || AgentModelRole.Auto,
      maxSteps: AGENT_RUNTIME_DEFAULTS.maxSteps,
      ...(options?.requestContext ? { requestContext: options.requestContext } : {}),
      tracingOptions: {
        traceId,
        ...(options?.parentSpanId ? { parentSpanId: options.parentSpanId } : {}),
      },
    })
  }
}

// Factory function for easy instantiation
export async function createStorytellerAgent(
  modelName?: string
): Promise<StorytellerAgent> {
  return StorytellerAgent.create(modelName)
}
