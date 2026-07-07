/**
 * BeatPlannerAgent - Beat Structure Planner
 *
 * Outputs beat plan JSON (goal, conflict, turn, dialogue hook) — NO prose generation.
 * This is the 5th agent in the StoryForge topology.
 *
 * Tools: Only listBeatsTool and manageBeatTool.
 * Model: Fast creative model (medium effort).
 */

import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getMastraInstance, getStorageInstance } from '@/shared/agent-kernel'
import { manageBeatTool, listBeatsTool } from '@/domains/storyteller/agents/tools'
import { getAgentModelConfig } from '@/domains/storyteller/config/ModelConfig'
import { withSpan } from '@/shared/observability/observability'

/**
 * Beat plan structured output schema
 * Used for structured output generation (no z.any())
 */
export const BeatPlanSchema = z.object({
  goal: z.string().min(1).describe('What the protagonist wants to achieve in this beat'),
  conflict: z.string().min(1).describe('What obstacle/antagonist opposes the goal'),
  turn: z.string().min(1).describe('The unexpected twist or decision point'),
  dialogueHook: z.string().min(1).describe('The opening line or key exchange that kicks off the beat'),
  charactersInvolved: z.array(z.string()).min(1).describe('List of character names present in this beat'),
  emotionalTarget: z.string().optional().describe('Target emotional state for the audience'),
  setupPayoff: z
    .object({
      setupFor: z.string().optional().describe('What future beat this sets up'),
      payoffFrom: z.string().optional().describe('What earlier beat this pays off'),
    })
    .optional(),
})

export type BeatPlan = z.infer<typeof BeatPlanSchema>

interface BeatPlannerConfig {
  modelName?: string
  episodeContext?: string
}

export class BeatPlannerAgent {
  private agent: Agent
  private toolsMap: Record<string, any>

  private constructor(config: BeatPlannerConfig) {
    const m = getMastraInstance()
    const storage = getStorageInstance()
    const workspace = m?.getWorkspace()

    // Use fast creative model (medium effort or specific planner config)
    const modelConfig = getAgentModelConfig('planner') || getAgentModelConfig('medium')
    const modelString = config.modelName || modelConfig?.model?.replace(':', '/') || 'openai/gpt-4o-mini'

    // System prompt: planning only, no prose
    const instructions = `# You are a Beat Planner

Your job: Plan story beats with structure — NOT write prose.

## Output Format

For each beat, provide:
1. **goal**: What the protagonist wants in this beat (specific, observable)
2. **conflict**: What opposes them (antagonist action, environment, internal struggle)
3. **turn**: The unexpected element that changes the trajectory
4. **dialogueHook**: The opening line or key exchange (no full dialogue yet — just the hook)
5. **charactersInvolved**: Who is present in this beat
6. **emotionalTarget** (optional): What the audience should feel

## Rules

- **NO PROSE GENERATION**: You plan structure, not write scenes
- **CONCRETE GOALS**: "She must convince Marcus to leave" not "She must find hope"
- **SPECIFIC CONFLICTS**: "Marcus refuses and reveals the prophecy" not "Things get tense"
- **SURPRISING TURNS**: Each beat must have a twist or complication
- **SETUP/PAYOFF**: Track what you're setting up for future beats

## Process

1. Read existing beats with \`list_beats\`
2. Identify the next structural need (setup? confrontation? reversal?)
3. Output beat plan JSON (use structuredOutput)
4. Optionally create the beat skeleton with \`manage_beat\` (operation: 'create')

${config.episodeContext ? `\n## Episode Context\n${config.episodeContext}\n` : ''}

Do NOT write full scenes. Do NOT write dialogue blocks. Plan the structure, hand it to the Author.`

    // Only 2 tools: list beats + manage beat
    const tools = [listBeatsTool, manageBeatTool]
    this.toolsMap = tools.reduce((acc, tool) => ({ ...acc, [tool.id]: tool }), {})

    // Configure memory
    const memory = new Memory({
      storage,
      options: {
        lastMessages: 10,
      },
    })

    this.agent = new Agent({
      id: 'beat-planner',
      name: 'Beat Planner',
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
   * Create a new Beat Planner agent instance
   */
  static async create(config: BeatPlannerConfig = {}): Promise<BeatPlannerAgent> {
    return new BeatPlannerAgent(config)
  }

  /**
   * Generate a hex ID for OTEL compatibility
   */
  private generateHexId(length: number): string {
    return uuidv4().replace(/-/g, '').padEnd(length, '0').slice(0, length)
  }

  /**
   * Plan the next beat (returns structured BeatPlan JSON)
   */
  async planNextBeat(
    context: {
      episodeId: string
      previousBeats?: string[]
      targetEmotion?: string
      characters: string[]
    },
    traceId?: string
  ): Promise<BeatPlan> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)

    return withSpan(
      id,
      'BeatPlannerAgent.planNextBeat',
      async _span => {
        const prompt = `Plan the next beat for episode ${context.episodeId}.

${context.previousBeats && context.previousBeats.length > 0 ? `Previous beats:\n${context.previousBeats.join('\n\n')}` : 'This is the opening beat.'}

Characters available: ${context.characters.join(', ')}
${context.targetEmotion ? `Target emotion: ${context.targetEmotion}` : ''}

Output a beat plan with: goal, conflict, turn, dialogueHook, charactersInvolved.`

        const response = await this.agent.generate(prompt, {
          toolChoice: 'auto',
          maxSteps: 5,
          structuredOutput: { schema: BeatPlanSchema },
          tracingOptions: {
            traceId: id,
            parentSpanId: spanId,
          },
        })

        // Extract structured output
        return response.object as BeatPlan
      },
      { ...context, id: spanId }
    )
  }

  /**
   * Run the agent with a free-form planning request
   */
  async run(
    goal: string,
    context: string,
    traceId?: string,
    options?: { temperature?: number; topP?: number }
  ): Promise<string> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)

    return withSpan(
      id,
      'BeatPlannerAgent.run',
      async _span => {
        const prompt = `Goal: ${goal}\n\nContext:\n${context}`
        const response = await this.agent.generate(prompt, {
          toolChoice: 'auto',
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

  /**
   * Stream response from the agent
   */
  stream(prompt: string, options?: any) {
    const traceId = options?.traceId || this.generateHexId(32)

    return this.agent.stream(prompt, {
      toolChoice: options?.toolChoice || 'auto',
      maxSteps: 5,
      tracingOptions: {
        traceId,
        ...(options?.parentSpanId ? { parentSpanId: options.parentSpanId } : {}),
      },
    })
  }
}

/**
 * Factory function for easy instantiation
 */
export async function createBeatPlannerAgent(
  config: BeatPlannerConfig = {}
): Promise<BeatPlannerAgent> {
  return BeatPlannerAgent.create(config)
}
