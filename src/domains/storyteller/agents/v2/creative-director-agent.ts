/**
 * Creative Director Agent
 *
 * Meta-agents that influence the style and approach of all other agents.
 * Think of them as "Creative Showrunners" like GRRM or Vince Gilligan.
 */

import { Agent } from '@mastra/core/agent'
import { v4 as uuidv4 } from 'uuid'
import {
  createAgentTrace,
  recordAgentGeneration,
  withSpan,
} from '../../../../agent-core/observability'
import { getWorkflowTraceId } from '../../utils/workflow-context'
import { getMastraInstance } from './mastra-instance'

export type CreativeDirectorType = 'grrm' | 'gilligan' | 'custom'

interface CreativeDirectorConfig {
  type: CreativeDirectorType
  modelName: string
  traceId?: string
  projectId?: string
  episodeId?: string
  customDirectives?: string
}

// Creative Director Prompts
const GRRM_PROMPT = `You are the Creative Director channeling the storytelling philosophy of George R.R. Martin.

YOUR ROLE:
You don't write content directly. You GUIDE other agents to write in the GRRM style.

CORE PRINCIPLES:
1. **Gardening, Not Architecting**: Let characters grow organically. Don't force predetermined paths.
2. **Gray Morality**: No pure heroes or villains. Every character should have understandable motivations.
3. **Consequences Are Permanent**: Death is real. Choices matter. No resurrections without cost.
4. **Political Reality**: Power, alliances, and betrayal drive history.
5. **Earned Subversion**: Subvert expectations, but only after proper foreshadowing.
6. **Rich Sensory Detail**: Food, weather, clothing - the world should feel lived-in.

WHEN REVIEWING CONTENT:
- Challenge any "plot armor" or convenient survivals
- Push for more political complexity
- Ask: "Would this character really do this?"
- Ensure deaths are earned, not shock value
- Demand richer worldbuilding details

SIGNATURE TECHNIQUES TO ENFORCE:
- Multiple POV structure
- Unreliable narrators
- Slow-burn revelations
- Food descriptions that ground scenes
- History that feels ancient and real`

const GILLIGAN_PROMPT = `You are the Creative Director channeling the storytelling philosophy of Vince Gilligan.

YOUR ROLE:
You don't write content directly. You GUIDE other agents to write in the Gilligan style.

CORE PRINCIPLES:
1. **Mr. Chips to Scarface**: Every protagonist is on a transformation journey.
2. **Visual Storytelling**: Every scene should work as a silent film.
3. **Consequence Mapping**: Every action creates ripples. Track them obsessively.
4. **Ironic Justice**: The punishment should fit the crime, often poetically.
5. **Earned Tension**: Build dread through anticipation, not surprise.
6. **Character Logic**: We must UNDERSTAND (not approve) every choice.

WHEN REVIEWING CONTENT:
- Ask: "What does this look like? What's the visual?"
- Check: "Is this transformation earned through small steps?"
- Ensure: "Does the audience understand WHY they made this choice?"
- Verify: "What's the ironic consequence of this action?"
- Demand: "Show me the cold open that recontextualizes this."

SIGNATURE TECHNIQUES TO ENFORCE:
- Cold opens with shocking imagery
- Color symbolism (breaking bad's colors)
- Montage sequences that compress time
- Silence and stillness for impact
- POV shots that put us in character's shoes
- Foreshadowing that rewards rewatching`

export class CreativeDirectorAgent {
  private agent: Agent
  private traceId: string
  private config: CreativeDirectorConfig

  private constructor(config: CreativeDirectorConfig, instructions: string) {
    this.config = config
    this.traceId = config.traceId || getWorkflowTraceId() || uuidv4()

    const m = getMastraInstance()
    // Use string model identifier for Mastra AI SDK v5 compatibility
    const modelString = config.modelName.replace(':', '/')

    const directorName =
      config.type === 'grrm' ? 'GRRM' : config.type === 'gilligan' ? 'Gilligan' : 'Custom Director'

    this.agent = new Agent({
      id: `creative-director-${config.type}`,
      name: `Creative Director: ${directorName}`,
      instructions,
      model: modelString,
      mastra: m,
    })

    this.createAgentTrace()
  }

  private createAgentTrace() {
    const directorName =
      this.config.type === 'grrm'
        ? 'GRRM'
        : this.config.type === 'gilligan'
          ? 'Gilligan'
          : 'CustomDirector'
    createAgentTrace({
      traceId: this.traceId,
      agentName: `CreativeDirector_${directorName}`,
      projectId: this.config.projectId,
      episodeId: this.config.episodeId,
    })
  }

  getTraceId(): string {
    return this.traceId
  }

  getDirectorType(): CreativeDirectorType {
    return this.config.type
  }

  static async create(
    type: CreativeDirectorType,
    modelName: string = 'openai:gpt-4o',
    options?: {
      traceId?: string
      projectId?: string
      episodeId?: string
      customDirectives?: string
    }
  ): Promise<CreativeDirectorAgent> {
    let instructions: string

    switch (type) {
      case 'grrm':
        instructions = GRRM_PROMPT
        break
      case 'gilligan':
        instructions = GILLIGAN_PROMPT
        break
      case 'custom':
        instructions = options?.customDirectives || 'You are a creative director.'
        break
      default:
        instructions = GRRM_PROMPT
    }

    return new CreativeDirectorAgent(
      {
        type,
        modelName,
        traceId: options?.traceId,
        projectId: options?.projectId,
        episodeId: options?.episodeId,
        customDirectives: options?.customDirectives,
      },
      instructions
    )
  }

  /**
   * Review content from another agent and provide director-level feedback
   */
  async reviewContent(
    content: string,
    context: string,
    originalAgent: string,
    traceId?: string
  ): Promise<{ feedback: string; approved: boolean; suggestions: string[] }> {
    const id = traceId || this.traceId

    return withSpan(
      id,
      'CreativeDirector.reviewContent',
      async span => {
        const prompt = `Review this content from the ${originalAgent} agent.

CONTENT TO REVIEW:
${content}

CONTEXT:
${context}

Provide:
1. Your overall assessment (does this align with your creative philosophy?)
2. Specific issues to fix
3. Concrete suggestions for improvement
4. Final verdict: APPROVED or NEEDS_REVISION

Format your response as JSON:
{
  "approved": true/false,
  "feedback": "Overall assessment...",
  "issues": ["Issue 1", "Issue 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}`

        const response = await this.agent.generate(prompt)
        const text = response.text

        // Parse the response
        try {
          // Try to extract JSON from the response
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            return {
              feedback: parsed.feedback || text,
              approved: parsed.approved || false,
              suggestions: parsed.suggestions || [],
            }
          }
        } catch {
          // If parsing fails, return raw text
        }

        return {
          feedback: text,
          approved: !text.toLowerCase().includes('needs_revision'),
          suggestions: [],
        }
      },
      { originalAgent, contentLength: content.length }
    )
  }

  /**
   * Generate creative direction for a scene or beat
   */
  async directScene(
    sceneDescription: string,
    context: string,
    traceId?: string
  ): Promise<{ direction: string; visualNotes: string; characterNotes: string }> {
    const id = traceId || this.traceId

    return withSpan(
      id,
      'CreativeDirector.directScene',
      async span => {
        const prompt = `You are directing this scene. Provide creative direction.

SCENE:
${sceneDescription}

CONTEXT:
${context}

Provide direction including:
1. Overall creative vision for this scene
2. Visual/cinematic notes (what should this look and feel like?)
3. Character performance notes (how should they behave?)
4. Key moments to emphasize
5. Traps to avoid (clichés, easy choices)`

        const response = await this.agent.generate(prompt)
        const text = response.text

        recordAgentGeneration(
          id,
          `CreativeDirector_${this.config.type}`,
          { prompt, context },
          { text },
          { model: this.config.modelName }
        )

        return {
          direction: text,
          visualNotes: this.extractSection(text, 'visual'),
          characterNotes: this.extractSection(text, 'character'),
        }
      },
      { sceneLength: sceneDescription.length }
    )
  }

  /**
   * Challenge a story decision
   */
  async challengeDecision(
    decision: string,
    rationale: string,
    alternatives: string[],
    traceId?: string
  ): Promise<{ challenge: string; betterPath?: string; maintain: boolean }> {
    const id = traceId || this.traceId

    return withSpan(
      id,
      'CreativeDirector.challengeDecision',
      async span => {
        const prompt = `As Creative Director, challenge this story decision.

DECISION:
${decision}

RATIONALE GIVEN:
${rationale}

ALTERNATIVES CONSIDERED:
${alternatives.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Your job is to:
1. Push back on easy or clichéd choices
2. Identify if they're avoiding a harder, better path
3. Ask the tough questions about character and consequence
4. Either approve with notes, or suggest a better direction`

        const response = await this.agent.generate(prompt)
        const text = response.text

        const maintain =
          text.toLowerCase().includes('approve') ||
          text.toLowerCase().includes('proceed') ||
          text.toLowerCase().includes('maintain')

        return {
          challenge: text,
          betterPath: maintain ? undefined : text,
          maintain,
        }
      },
      { decision }
    )
  }

  private extractSection(text: string, keyword: string): string {
    const lines = text.split('\n')
    const startIdx = lines.findIndex(l => l.toLowerCase().includes(keyword))
    if (startIdx === -1) return ''

    const endIdx = lines.findIndex(
      (l, i) => i > startIdx && l.match(/^\d+\./) && !l.toLowerCase().includes(keyword)
    )

    return lines
      .slice(startIdx, endIdx === -1 ? undefined : endIdx)
      .join('\n')
      .trim()
  }
}

// Factory functions
export async function createGRRMDirector(
  modelName: string = 'openai:gpt-4o',
  options?: { traceId?: string; projectId?: string; episodeId?: string }
): Promise<CreativeDirectorAgent> {
  return CreativeDirectorAgent.create('grrm', modelName, options)
}

export async function createGilliganDirector(
  modelName: string = 'openai:gpt-4o',
  options?: { traceId?: string; projectId?: string; episodeId?: string }
): Promise<CreativeDirectorAgent> {
  return CreativeDirectorAgent.create('gilligan', modelName, options)
}

export async function createCustomDirector(
  directives: string,
  modelName: string = 'openai:gpt-4o',
  options?: { traceId?: string; projectId?: string; episodeId?: string }
): Promise<CreativeDirectorAgent> {
  return CreativeDirectorAgent.create('custom', modelName, {
    ...options,
    customDirectives: directives,
  })
}
