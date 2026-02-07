/**
 * GameDesignAgent - Mastra Implementation
 *
 * Core agent for game loop design, following the same pattern as StorytellerAgent.
 * Uses specialized game design tools and prompts.
 */

import { Agent } from '@mastra/core/agent'
import { promptRepository } from '../../prompts/repository'
import { registerCorePrompts, registerGameDesignPrompts } from '../../prompts/registry'
import { withSpan } from '../../agent-core/observability'
import { v4 as uuidv4 } from 'uuid'

// Import all game design tools
import {
    createGetLoopsTool,
    createGetLoopByIdTool,
    createGetMarketAnalysisTool,
} from './tools/v2/loop-tools'
import {
    createIdentifyCoreLoopTool,
    createAnalyzeMechanicBalanceTool,
    createSuggestProgressionTool,
    createValidateLoopStructureTool,
} from './tools/v2/logic-transformers'
import { createAllHauteGameTools } from './tools/v2/haute-game-tools'
import { GameDesignMemory } from './memory'
import { GameLoop, GameMechanic } from './schemas'

interface GameDesignAgentConfig {
    modelName?: string
    memory?: GameDesignMemory
}

export interface GameDesignContext {
    projectId: string
    existingLoops?: GameLoop[]
    existingMechanics?: any[] // Accept loose mechanic objects from canvas
    genre?: string
    targetAudience?: 'casual' | 'midcore' | 'hardcore'
    theme?: string
    userMessage?: string
}

// Response types matching CoPilot protocol for UI compatibility
export type GameDesignResponse =
    | { type: 'ASK_USER'; payload: { question: string; options?: string[] }; thought?: string }
    | { type: 'PROPOSE_PLAN'; payload: { plan: any }; thought?: string }
    | { type: 'EXECUTE_STEP'; payload: { tool: string; result?: any; mechanics?: any[]; loops?: any[]; balanceAnalysis?: any }; thought?: string }
    | { type: 'FINISH'; payload: { result: string; mechanics?: any[]; loops?: any[]; balanceAnalysis?: any }; thought?: string }

export class GameDesignAgent {
    private agent: Agent
    private toolsMap: Record<string, any>
    private memory?: GameDesignMemory

    private constructor(config: GameDesignAgentConfig, instructions: string) {
        // Instantiate all tools
        const dataTools = [
            createGetLoopsTool(),
            createGetLoopByIdTool(),
            createGetMarketAnalysisTool(),
        ]

        const logicTools = [
            createIdentifyCoreLoopTool(),
            createAnalyzeMechanicBalanceTool(),
            createSuggestProgressionTool(),
            createValidateLoopStructureTool(),
        ]

        // Haute Game Framework tools (Klei + CDPR + Kojima philosophy)
        const hauteGameTools = createAllHauteGameTools()

        const allTools = [...dataTools, ...logicTools, ...hauteGameTools]

        // Store tools for direct execution
        this.toolsMap = allTools.reduce((acc, tool) => ({ ...acc, [tool.id]: tool }), {})
        this.memory = config.memory

        this.agent = new Agent({
            name: 'Game Design Agent',
            instructions,
            model: config.modelName || 'openai:gpt-4o',
            defaultGenerateOptions: { toolChoice: 'auto' },
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

        return withSpan(id, 'GameDesignAgent.run', async () => {
            const prompt = `Goal: ${goal}\n\nContext:\n${context}`
            const response = await this.agent.generate(prompt)
            return response.text
        }, { goal, context })
    }

    /**
     * Run with structured context and return CoPilot-compatible response
     */
    async runWithContext(context: GameDesignContext): Promise<GameDesignResponse> {
        const id = uuidv4()

        return withSpan(id, 'GameDesignAgent.runWithContext', async () => {
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
                            enrichedContext += relevantPatterns.map(p =>
                                `- ${p.title}: ${p.description}`
                            ).join('\n')
                        }
                    } catch (e) {
                        // Memory search failed, continue without patterns
                        console.warn('Memory search failed:', e)
                    }
                }

                const goal = context.userMessage || 'Analyze and improve the game loop design'
                const prompt = `Goal: ${goal}\n\nContext:\n${enrichedContext}

Please analyze and respond with your thoughts and recommendations.
If you use any tools, describe what you learned from them.`

                const response = await this.agent.generate(prompt)
                const text = response.text

                // Parse response into structured format
                return this.parseResponse(text)
            } catch (e: any) {
                console.error('GameDesignAgent.runWithContext failed:', e)
                return {
                    type: 'FINISH',
                    payload: { result: `Error: ${e.message}` },
                    thought: 'An error occurred during processing.'
                }
            }
        }, context)
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
     * Stream response from the agent
     */
    async stream(prompt: string) {
        return this.agent.stream(prompt)
    }

    /**
     * Execute a specific tool directly
     */
    async executeTool(toolId: string, args: Record<string, unknown>): Promise<any> {
        const tool = this.toolsMap[toolId]
        if (!tool) {
            throw new Error(`Tool ${toolId} not found. Available: ${Object.keys(this.toolsMap).join(', ')}`)
        }
        return tool.execute({ context: args })
    }

    private buildContextString(context: GameDesignContext): string {
        const parts: string[] = []

        parts.push(`## Project: ${context.projectId}`)

        if (context.genre) {
            parts.push(`## Genre: ${context.genre}`)
        }

        if (context.targetAudience) {
            parts.push(`## Target Audience: ${context.targetAudience}`)
        }

        if (context.theme) {
            parts.push(`## Theme: ${context.theme}`)
        }

        if (context.existingLoops?.length) {
            parts.push(`## Existing Loops`)
            for (const loop of context.existingLoops) {
                parts.push(`- ${loop.name} (${loop.type}): ${loop.nodes?.length || 0} nodes, ${loop.edges?.length || 0} edges`)
            }
        }

        if (context.existingMechanics?.length) {
            parts.push(`## Existing Mechanics`)
            for (const mech of context.existingMechanics) {
                parts.push(`- ${mech.name} (${mech.type}): ${mech.description || 'No description'}`)
            }
        }

        return parts.join('\n')
    }

    private parseResponse(text: string): GameDesignResponse {
        // Try to extract structured response
        const thought = text

        // Check if there are tool results in the response
        const toolMatch = text.match(/Tool Result:?\s*({[\s\S]*?})/i)
        if (toolMatch) {
            try {
                const toolResult = JSON.parse(toolMatch[1])
                return {
                    type: 'EXECUTE_STEP',
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

        // Default to FINISH with the full response
        return {
            type: 'FINISH',
            payload: { result: text },
            thought,
        }
    }
}

// Factory function for easy instantiation
export async function createGameDesignAgent(
    modelName: string = 'openai:gpt-4o'
): Promise<GameDesignAgent> {
    return GameDesignAgent.create({ modelName })
}

// Re-export for convenience
export { GameDesignMemory } from './memory'
