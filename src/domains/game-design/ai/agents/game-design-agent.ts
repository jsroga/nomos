import { Agent } from '@mastra/core/agent'
import { promptRepository } from '@/shared/agent-kernel/prompts/repository'
import { registerCorePrompts, registerGameDesignPrompts } from '@/shared/agent-kernel/prompts/registry'
import { withMastraSpan } from '@/shared/observability/mastra-tracing'
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
  GameDesignDefaultModel,
  GameDesignModelSeparator,
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

  private constructor(config: GameDesignAgentConfig, instructions: string) {
    const allTools = createGameDesignToolList()

    this.toolsMap = allTools.reduce<Record<string, GameDesignTool>>((acc, tool) => {
      acc[tool.id] = tool
      return acc
    }, {})
    this.memory = config.memory

    const modelString = (config.modelName || GameDesignDefaultModel.OpenAiGpt4o).replace(
      GameDesignModelSeparator.Colon,
      GameDesignModelSeparator.Slash
    )

    this.agent = new Agent({
      id: GameDesignAgentId.GameDesignAgent,
      name: GameDesignAgentLabel.GameDesignAgent,
      instructions,
      model: modelString,
      tools: this.toolsMap,
    })
  }

  static async create(config: GameDesignAgentConfig = {}): Promise<GameDesignAgent> {
    registerCorePrompts()
    registerGameDesignPrompts()

    let instructions: string
    try {
      instructions = await promptRepository.getPrompt(GameDesignSystemPromptId.GameDesignSystem)
    } catch {
      instructions = `You are a senior game designer combining the philosophies of:
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
    }

    return new GameDesignAgent(config, instructions)
  }

  async run(goal: string, context: string, traceId?: string): Promise<string> {
    const id = traceId || uuidv4()

    return withMastraSpan(
      id,
      GameDesignAgentSpan.Run,
      async () => {
        const prompt = `${GameDesignAgentPromptCopy.GoalPrefix}${goal}${NewlineSeparator.Double}${GameDesignAgentPromptCopy.ContextPrefix}${context}`
        const response = await this.agent.generate(prompt)
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

          const response = await this.agent.generate(prompt)
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
