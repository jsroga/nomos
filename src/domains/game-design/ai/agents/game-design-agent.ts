/**
 * GameDesignAgent - Mastra Implementation
 *
 * Core agent for game loop design, following the same pattern as StorytellerAgent.
 * Uses specialized game design tools and prompts.
 */

import { Agent } from '@mastra/core/agent'
import { promptRepository } from '@/shared/agent-kernel/prompts/repository'
import { registerCorePrompts, registerGameDesignPrompts } from '@/shared/agent-kernel/prompts/registry'
import { withSpan } from '@/shared/observability/observability'
import { v4 as uuidv4 } from 'uuid'

import {
  createGameDesignToolList,
  type GameDesignPlanPersistence,
  type GameDesignTool,
} from '../constants/game-design-tools'
import { invokeGameDesignTool } from '../constants/invoke-game-design-tool'
import {
  GameDesignResponseType,
  parseGameDesignResponseRecord,
  type GameDesignResponse,
} from '../constants/game-design-response'
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
  /** High-level game concept from the user; critical for coherent suggestions */
  gameDescription?: string
  /** Platform (e.g. PC, mobile, console) */
  platform?: string
  /** Recent conversation turns so the agent can stay on topic and avoid repeating */
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

    // Use string model identifier for Mastra AI SDK v5 compatibility
    const modelString = (config.modelName || 'openai:gpt-4o').replace(':', '/')

    this.agent = new Agent({
      id: 'game-design-agent',
      name: 'Game Design Agent',
      instructions,
      model: modelString,
      tools: this.toolsMap,
    })
  }

  static async create(config: GameDesignAgentConfig = {}): Promise<GameDesignAgent> {
    registerCorePrompts()
    registerGameDesignPrompts()

    // Get the game design system prompt
    let instructions: string
    try {
      instructions = await promptRepository.getPrompt('game-design-system')
    } catch {
      // Fallback prompt if not registered
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

  /**
   * Run the agent with a simple goal and context
   */
  async run(goal: string, context: string, traceId?: string): Promise<string> {
    const id = traceId || uuidv4()

    return withSpan(
      id,
      'GameDesignAgent.run',
      async () => {
        const prompt = `Goal: ${goal}\n\nContext:\n${context}`
        const response = await this.agent.generate(prompt)
        return response.text
      },
      { goal, context }
    )
  }

  /**
   * Run with structured context and return CoPilot-compatible response
   */
  async runWithContext(context: GameDesignContext): Promise<GameDesignResponse> {
    const id = uuidv4()

    return withSpan(
      id,
      'GameDesignAgent.runWithContext',
      async () => {
        try {
          // Build rich context
          let enrichedContext = this.buildContextString(context)

          // If memory is available, retrieve relevant patterns
          if (this.memory) {
            try {
              const relevantPatterns = await this.memory.search(
                context.userMessage || context.genre || 'game loop design',
                5
              )
              if (relevantPatterns.length > 0) {
                enrichedContext += '\n\n## Relevant Game Design Patterns\n'
                enrichedContext += relevantPatterns
                  .map(p => `- ${p.title}: ${p.description}`)
                  .join('\n')
              }
            } catch (e) {
              // Memory search failed, continue without patterns
              console.warn('Memory search failed:', e)
            }
          }

          const goal = context.userMessage || 'Analyze and improve the game loop design'
          let prompt = ''

          if (context.recentMessages?.length) {
            const convo = context.recentMessages
              .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
              .join('\n\n')
            prompt += `## Recent conversation\n${convo}\n\n`
          }

          prompt += `Goal (current message): ${goal}\n\nContext:\n${enrichedContext}

Please analyze and respond with your thoughts and recommendations.
If you use any tools, describe what you learned from them.`

          const response = await this.agent.generate(prompt)
          const text = response.text

          // Parse response into structured format
          return this.parseResponse(text)
        } catch (e: unknown) {
          console.error('GameDesignAgent.runWithContext failed:', e)
          return {
            type: GameDesignResponseType.Finish,
            payload: { result: `Error: ${getErrorMessage(e)}` },
            thought: 'An error occurred during processing.',
          }
        }
      },
      context
    )
  }

  /**
   * Design a new game loop
   */
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
      userMessage: `Design a ${input.loopType || 'core'} game loop for a ${input.genre} game targeting ${input.targetAudience} players.${input.theme ? ` Theme: ${input.theme}.` : ''}${input.referenceGames?.length ? ` Reference games: ${input.referenceGames.join(', ')}.` : ''}`,
    }

    return this.runWithContext(context)
  }

  /**
   * Analyze an existing loop
   */
  async analyzeLoop(loop: GameLoop, mechanics: GameMechanic[]): Promise<GameDesignResponse> {
    const context: GameDesignContext = {
      projectId: loop.projectId,
      existingLoops: [loop],
      existingMechanics: mechanics,
      userMessage: `Analyze the balance of the "${loop.name}" loop and identify any issues or improvements.`,
    }

    return this.runWithContext(context)
  }

  /**
   * Stream response from the agent (Mastra pattern, same as StorytellerAgent).
   * Options: memory (resource, thread), maxSteps, toolChoice, etc.
   */
  async stream(
    prompt: string,
    options?: { toolChoice?: 'auto' | 'none' | 'required'; maxSteps?: number }
  ) {
    return this.agent.stream(prompt, {
      toolChoice: options?.toolChoice ?? 'auto',
      maxSteps: options?.maxSteps ?? 10,
    })
  }

  /**
   * Execute a specific tool directly
   */
  async executeTool(toolId: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.toolsMap[toolId]
    if (!tool) {
      throw new Error(
        `Tool ${toolId} not found. Available: ${Object.keys(this.toolsMap).join(', ')}`
      )
    }
    return invokeGameDesignTool(tool, args)
  }

  private buildContextString(context: GameDesignContext): string {
    const parts: string[] = []

    parts.push(`## Project: ${context.projectId}`)

    if (context.genre) {
      parts.push(`## Genre: ${context.genre}`)
    }

    if (context.platform) {
      parts.push(`## Platform: ${context.platform}`)
    }

    if (context.targetAudience) {
      parts.push(`## Target Audience: ${context.targetAudience}`)
    }

    if (context.gameDescription) {
      parts.push(`## Game concept / description\n${context.gameDescription}`)
    }

    if (context.theme) {
      parts.push(`## Theme: ${context.theme}`)
    }

    if (context.existingLoops?.length) {
      parts.push('## Existing Loops')
      for (const loop of context.existingLoops) {
        parts.push(
          `- ${loop.name} (${loop.type}): ${loop.nodes?.length || 0} nodes, ${loop.edges?.length || 0} edges`
        )
      }
    }

    if (context.existingMechanics?.length) {
      parts.push('## Existing Mechanics')
      for (const mech of context.existingMechanics) {
        parts.push(`- ${mech.name} (${mech.type}): ${mech.description || 'No description'}`)
      }
    }

    return parts.join('\n')
  }

  private parseResponse(text: string): GameDesignResponse {
    // Extract <thinking> block content
    const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/i)
    const thought = thinkingMatch ? thinkingMatch[1].trim() : text

    // Extract text after </thinking> tag, or use full text if no thinking block
    const afterThinking = thinkingMatch
      ? text.slice(text.indexOf('</thinking>') + '</thinking>'.length).trim()
      : text.trim()

    // Try to parse structured JSON response (e.g. { "type": "PROPOSE_PLAN", "payload": ... })
    const jsonMatch = afterThinking.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = parseGameDesignResponseRecord(JSON.parse(jsonMatch[0]), thought)
        if (parsed) return parsed
      } catch {
        // Not valid JSON, continue
      }
    }

    // Check if there are tool results in the response
    const toolMatch = text.match(/Tool Result:?\s*({[\s\S]*?})/i)
    if (toolMatch) {
      try {
        const toolResult: unknown = JSON.parse(toolMatch[1])
        return {
          type: GameDesignResponseType.ExecuteStep,
          payload: {
            tool: 'analysis',
            result: toolResult,
          },
          thought,
        }
      } catch {
        // Not valid JSON, continue
      }
    }

    return {
      type: GameDesignResponseType.Finish,
      payload: { result: text },
      thought,
    }
  }
}

// Factory function for easy instantiation
// Re-export for convenience
export { GameDesignMemory } from './memory'
