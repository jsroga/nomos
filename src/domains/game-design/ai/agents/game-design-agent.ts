import { meteredCall } from '@/shared/ai/gateway/agent'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { Agent } from '@mastra/core/agent'
import { promptRepository } from '@/shared/agent-kernel/prompts/repository'
import { registerCorePrompts, registerGameDesignPrompts } from '@/shared/agent-kernel/prompts/registry'
import { withMastraSpan } from '@/shared/observability/mastra-tracing'
import { resolveGameDesignModel } from '@/domains/game-design/config/model-config'
import { v4 as uuidv4 } from 'uuid'

import {
  createGameDesignToolList,
  type GameDesignPlanPersistence,
  type GameDesignTool,
} from '../constants/game-design-tools'
import { invokeGameDesignTool } from '../constants/invoke-game-design-tool'
import {
  GameDesignResponseType,
  type GameDesignResponse,
} from '../constants/game-design-response'
import {
  GameDesignAgentCopy,
  GameDesignAgentPromptCopy,
  NewlineSeparator,
  ListSeparator,
} from '../constants/agent-copy'
import {
  GameDesignAgentId,
  GameDesignAgentLabel,
  GameDesignAgentSpan,
  GameDesignStreamToolChoice,
  GameDesignSystemPromptId,
} from '../constants/agent-identity'
import {
  buildDesignLoopUserMessage,
  buildGameDesignContextString,
  formatRecentConversation,
  parseGameDesignAgentResponse,
} from './game-design-agent-helpers'
import { GameDesignMemory } from './memory'
import { GameLoop, GameMechanic } from '../../core/schemas'
import { getErrorMessage } from '@/shared/errors/error-utils'

export type { GameDesignResponse } from '../constants/game-design-response'

const GAME_DESIGN_FALLBACK_INSTRUCTIONS = `You are a senior game designer combining the philosophies of:
- **Klei** (Don't Starve, ONI): Elegant systems with emergent complexity
- **CD Projekt Red** (Witcher, Cyberpunk): Deep narrative with moral grey areas
- **Kojima** (Death Stranding, MGS): Connection and meaningful mundane

Your expertise includes:
- Designing engaging core, meta, and social loops
- Balancing game economies and progression systems
- Identifying psychological hooks that drive player engagement
- Creating emergent systems where simple rules create complex outcomes
- Designing morally complex choices with real consequences
- Building connection systems for async multiplayer
- Elevating routine mechanics into meaningful rituals
- Teaching through play, not instruction

## Haute Game Philosophy
"Systems that tell stories, stories that connect players, players that discover meaning."

When given a task:
1. Consider the atomic building blocks (verbs + nouns = interactions)
2. Think about how the world remembers player actions
3. Ensure choices have real weight with no easy answers
4. Design for player discovery, not hand-holding
5. Make routine actions feel meaningful

The ultimate test: "Would players tell stories about what happened to them?"`

/**
 * Resolve the game-design system prompt (registry → fallback). Used as the
 * Agent's dynamic `instructions` callback so construction stays synchronous
 * (prompt load is deferred to first generate), which is what lets the agent be
 * registered on the central Mastra instance at module-load time without keys.
 */
export async function resolveGameDesignInstructions(): Promise<string> {
  registerCorePrompts()
  registerGameDesignPrompts()
  try {
    return await promptRepository.getPrompt(GameDesignSystemPromptId.GameDesignSystem)
  } catch {
    return GAME_DESIGN_FALLBACK_INSTRUCTIONS
  }
}

interface GameDesignAgentConfig {
  modelName?: string
  memory?: GameDesignMemory
  persistence?: GameDesignPlanPersistence
}

export interface GameDesignContext {
  projectId: string
  existingLoops?: GameLoop[]
  existingMechanics?: GameMechanic[]
  genre?: string
  targetAudience?: 'casual' | 'midcore' | 'hardcore'
  theme?: string
  userMessage?: string
  gameDescription?: string
  platform?: string
  recentMessages?: { role: 'user' | 'assistant'; content: string }[]
}

export class GameDesignAgent {
  private agent: Agent
  private toolsMap: Record<string, GameDesignTool>
  private memory?: GameDesignMemory

  private constructor(config: GameDesignAgentConfig) {
    const allTools = createGameDesignToolList()

    this.toolsMap = allTools.reduce<Record<string, GameDesignTool>>((acc, tool) => {
      acc[tool.id] = tool
      return acc
    }, {})
    this.memory = config.memory

    this.agent = new Agent({
      id: GameDesignAgentId.GameDesignAgent,
      name: GameDesignAgentLabel.GameDesignAgent,
      instructions: () => resolveGameDesignInstructions(),
      model: () => resolveGameDesignModel(config.modelName),
      tools: this.toolsMap,
    })
  }

  /**
   * Synchronous construction — the dynamic `instructions`/`model` callbacks
   * defer prompt + model resolution to run time, so no `await` (and no keys)
   * are needed to build the agent. This is what allows central registration at
   * module-load time (see `core/io/mastra-runtime.ts`).
   */
  static createSync(config: GameDesignAgentConfig = {}): GameDesignAgent {
    return new GameDesignAgent(config)
  }

  /** Backward-compatible async factory. Kept for existing call sites. */
  static async create(config: GameDesignAgentConfig = {}): Promise<GameDesignAgent> {
    return GameDesignAgent.createSync(config)
  }

  /** The underlying Mastra `Agent` — the object registered on the central instance. */
  get mastraAgent(): Agent {
    return this.agent
  }

  async run(goal: string, context: string, traceId?: string): Promise<string> {
    const id = traceId || uuidv4()

    return withMastraSpan(
      id,
      GameDesignAgentSpan.Run,
      async () => {
        const prompt = `${GameDesignAgentPromptCopy.GoalPrefix}${goal}${NewlineSeparator.Double}${GameDesignAgentPromptCopy.ContextPrefix}${context}`
        const response = await meteredCall(LlmFeature.GameDesign, () => this.agent.generate(prompt))
        return response.text
      },
      { goal, context }
    )
  }

  async runWithContext(context: GameDesignContext): Promise<GameDesignResponse> {
    const id = uuidv4()

    return withMastraSpan(
      id,
      GameDesignAgentSpan.RunWithContext,
      async () => {
        try {
          let enrichedContext = buildGameDesignContextString(context)

          if (this.memory) {
            try {
              const relevantPatterns = await this.memory.search(
                context.userMessage || context.genre || GameDesignAgentCopy.MemorySearchDefault,
                5
              )
              if (relevantPatterns.length > 0) {
                enrichedContext += GameDesignAgentCopy.RelevantPatternsHeader
                enrichedContext += relevantPatterns
                  .map(pattern => `${GameDesignAgentCopy.PatternBulletPrefix}${pattern.title}: ${pattern.description}`)
                  .join(NewlineSeparator.Single)
              }
            } catch (error: unknown) {
              console.warn(GameDesignAgentCopy.MemorySearchFailed, error)
            }
          }

          const goal = context.userMessage || GameDesignAgentCopy.DefaultGoal
          let prompt = ''

          if (context.recentMessages?.length) {
            prompt += `${GameDesignAgentCopy.RecentConversationHeader}${NewlineSeparator.Single}${formatRecentConversation(context.recentMessages)}${NewlineSeparator.Double}`
          }

          prompt += `${GameDesignAgentPromptCopy.GoalCurrentPrefix}${goal}${NewlineSeparator.Double}${GameDesignAgentPromptCopy.ContextPrefix}${enrichedContext}${NewlineSeparator.Double}${GameDesignAgentPromptCopy.AnalyzeFooter}`

          const response = await meteredCall(LlmFeature.GameDesign, () => this.agent.generate(prompt))
          return parseGameDesignAgentResponse(response.text)
        } catch (error: unknown) {
          console.error(GameDesignAgentCopy.RunWithContextFailed, error)
          return {
            type: GameDesignResponseType.Finish,
            payload: { result: `Error: ${getErrorMessage(error)}` },
            thought: GameDesignAgentCopy.ProcessingError,
          }
        }
      },
      context
    )
  }

  async designLoop(input: {
    genre: string
    targetAudience: 'casual' | 'midcore' | 'hardcore'
    theme?: string
    loopType?: 'core' | 'meta' | 'social' | 'monetization'
    referenceGames?: string[]
  }): Promise<GameDesignResponse> {
    const context: GameDesignContext = {
      projectId: uuidv4(),
      genre: input.genre,
      targetAudience: input.targetAudience,
      theme: input.theme,
      userMessage: buildDesignLoopUserMessage(input),
    }

    return this.runWithContext(context)
  }

  async analyzeLoop(loop: GameLoop, mechanics: GameMechanic[]): Promise<GameDesignResponse> {
    const context: GameDesignContext = {
      projectId: loop.projectId,
      existingLoops: [loop],
      existingMechanics: mechanics,
      userMessage: `Analyze the balance of the "${loop.name}" loop and identify any issues or improvements.`,
    }

    return this.runWithContext(context)
  }

  async stream(
    prompt: string,
    options?: { toolChoice?: 'auto' | 'none' | 'required'; maxSteps?: number }
  ) {
    return this.agent.stream(prompt, {
      toolChoice: options?.toolChoice ?? GameDesignStreamToolChoice.Auto,
      maxSteps: options?.maxSteps ?? 10,
    })
  }

  async executeTool(toolId: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.toolsMap[toolId]
    if (!tool) {
      throw new Error(
        `Tool ${toolId} not found. Available: ${Object.keys(this.toolsMap).join(ListSeparator.CommaSpace)}`
      )
    }
    return invokeGameDesignTool(tool, args)
  }
}

export { GameDesignMemory } from './memory'
