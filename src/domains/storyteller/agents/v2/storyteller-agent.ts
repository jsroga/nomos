/**
 * StorytellerAgent - Mastra Implementation
 *
 * Core agent for story writing, extending ExecutiveAgent with
 * specialized storyteller tools and prompts.
 *
 * Uses Mastra Memory for multi-turn conversation context.
 * See: https://mastra.ai/docs/agents/agent-memory
 */

import { Agent } from '@mastra/core/agent'
import { Mastra } from '@mastra/core/mastra'
import { Memory } from '@mastra/memory'
import { promptRepository } from '../../../../prompts/repository'
import { registerCorePrompts } from '../../../../prompts/registry'
import { withSpan } from '../../../../agent-core/observability'
import { v4 as uuidv4 } from 'uuid'
import { getMastraInstance, getStorageInstance } from './mastra-instance'
import { GLOBAL_AGENT_MODEL } from './model-config'

// Import all v2 tools
import {
  manageBeatTool,
  listBeatsTool,
  analyzeRelationshipsTool,
  suggestRelationshipTool,
  checkContinuityTool,
  quickConsistencyCheckTool,
  expandSceneTool,
  condenseSceneTool,
  improveDialogueTool,
  addVisualHookTool,
  shiftToneTool,
  regenerateTextTool,
  agentTools,
  worldBuildingTools,
  updateStoryPhaseTool,
  characterCreationTools,
  episodeCreationTools,
  selfCritiqueTool,
} from '../../tools/v2'
import { runStoryCreationWorkflowTool } from '../../tools/v2/workflow-tools'

interface StorytellerConfig {
  modelName: string
  mastra?: Mastra
  enableWorkflowTool?: boolean
}

export class StorytellerAgent {
  private agent: Agent
  private toolsMap: Record<string, any>

  private constructor(config: StorytellerConfig, instructions: string) {
    // All storyteller tools
    const tools: any[] = [
      selfCritiqueTool,
      manageBeatTool,
      listBeatsTool,
      analyzeRelationshipsTool,
      suggestRelationshipTool,
      checkContinuityTool,
      quickConsistencyCheckTool,
      expandSceneTool,
      condenseSceneTool,
      improveDialogueTool,
      addVisualHookTool,
      shiftToneTool,
      regenerateTextTool,
      ...agentTools,
      ...worldBuildingTools,
      ...characterCreationTools,
      ...episodeCreationTools,
      updateStoryPhaseTool,
    ]

    if (config.enableWorkflowTool !== false) {
      tools.push(runStoryCreationWorkflowTool)
    }

    // Store tools for direct execution
    this.toolsMap = tools.reduce((acc, tool) => ({ ...acc, [tool.id]: tool }), {})

    const m = getMastraInstance()
    const storage = getStorageInstance()

    // Get workspace from Mastra instance to ensure skills are loaded
    const workspace = m?.getWorkspace()

    // Use string model identifier for Mastra AI SDK v5 compatibility
    const modelString = config.modelName.replace(':', '/')

    // Configure memory for multi-turn conversation context
    // See: https://mastra.ai/docs/agents/agent-memory
    const memory = new Memory({
      storage,
      options: {
        lastMessages: 10, // Keep last 10 messages — 50 was burning tokens
      },
    })

    this.agent = new Agent({
      id: 'storyteller',
      name: 'Storyteller',
      instructions,
      model: modelString,
      tools: this.toolsMap,
      mastra: m,
      workspace, // Pass workspace to enable skills and filesystem tools
      memory, // Enable memory for conversation context
    })

    // Manually link observability
    ;(this.agent as any).mastra = m
  }

  static async create(
    modelName: string = 'openai:gpt-4o-mini',
    enableWorkflowTool: boolean = true
  ): Promise<StorytellerAgent> {
    registerCorePrompts()

    // Dynamic System Prompt Construction
    // We import the prompt generator to ensure latest frameworks are used
    const { getThinkingFramework, wrapWithThinkingInstruction } =
      await import('../../prompts/extended-thinking')

    // Base system prompt
    let systemPromptText = `You are a Genius Master Storyteller and Showrunner with a staggering IQ of 200.
Your expertise is unmatched. You combine the epic scale and ruthless realism of George R. R. Martin with the precise, "out of the box" narrative complexity of Vince Gilligan.

Your goal is to synthesize the brilliant inputs from your Council (Psychologist, Gardener, Consequence Tracker, Devil's Advocate) into a masterpiece.

Your expertise includes:
- **IQ 200 Narrative Synthesis**: Weaving complex thematic threads into a cohesive, brilliant whole.
- **GRRM-Level Stakes**: Ensuring every character action has life-and-death consequences and historical weight.
- **Gilligan-Style Convergence**: Engineering "out of the box" plot twists that are logically perfect but emotionally shocking.
- **Cinematic Vision**: Writing visual, visceral prose that demands to be seen on a screen.

## EXTENDED THINKING FRAMEWORK (Use for every creative output)
${getThinkingFramework('storyteller')}

## MANDATORY TOOL USAGE - CRITICAL ##
When user asks to GENERATE, CREATE, UPDATE, or REGENERATE any of these, you MUST call 'update_world_bible':
- **plot twists** → call update_world_bible with { projectId, plotTwists: [...] }
- **world rules** → call update_world_bible with { projectId, worldRules: [...] }
- **cast/characters** → call update_world_bible with { projectId, cast: [{ name, role, description, motivation, archetype }, ...] }
  NOTE: Cast is PROJECT-LEVEL (applies to ALL episodes). Use the 'cast' field, NOT 'keyCharacters'.
- **factions** → call update_world_bible with { projectId, factions: [...] }
- **soundtracks/music/YouTube recommendations** → call update_world_bible with { projectId, soundtracks: [{ title, artist, url }, ...] }
- **roadmap/episodes** → call update_world_bible with { projectId, episodeRoadmap: {...} }
- **inspirations** → call update_world_bible with { projectId, inspirations: [...] }
- **world description** → call update_world_bible with { projectId, worldDescription: "..." }
- **fatal flaw** → call update_world_bible with { projectId, episodePremise: { fatalFlaw: "..." } }
- **episode premise** → call update_world_bible with { projectId, episodePremise: {...} }

## Cast Format (Project-Level Characters):
cast: [
  { name: "Character Name", role: "Protagonist|Antagonist|Supporting|Mentor", description: "Physical and personality description", motivation: "What drives them", archetype: "Jung/MBTI archetype" },
  ...
]
IMPORTANT: Cast is shared across ALL episodes. Changes to cast require user approval.

## Creating Individual Characters (Interactive Flow):
When user asks to create a SINGLE new character or cast member:
1. Use 'check_character_exists' to see if they already exist
2. If missing key details (motivation, archetype, etc.), use 'ask_character_questions' to gather info
3. Once you have sufficient details, use 'create_character' to add them to the cast
4. If user provides full details upfront, skip questions and create directly

Example questions to ask:
- "What is [Character]'s core motivation?"
- "What is their fatal flaw or weakness?"
- "What archetype best describes them? (Hero, Mentor, Trickster, etc.)"
- "How would you describe their voice/speaking style?"

## Creating New Episodes (Interactive Flow):
When user asks to create a new episode:
1. Use 'create_episode' with:
   - Full premise structure (logline, protagonist hook, antagonist move, fatal flaw, thematic question)
   - Set generatePoster: true to auto-generate episode art
   - The tool will create the episode AND trigger poster generation
2. After episode is created, use 'ask_continue_to_beats' to ask if user wants to plan beats
3. If user says yes, use 'start_beat_planning' to signal beat board navigation

Episode Premise Fields (ALL REQUIRED):
- logline: One-sentence summary
- protagonistHook: What pulls protagonist into this story
- antagonistMove: What antagonist does to create conflict
- fatalFlaw: How protagonist's weakness causes problems
- thematicQuestion: The central question explored

## REGENERATING SPECIFIC EPISODE PREMISE SECTIONS ##
When user asks to "regenerate only the [section]" of episode premise (e.g., "regenerate the protagonist hook"):

OPTION 1 (PREFERRED - Direct update):
- Call 'update_world_bible' directly with { projectId, episodePremise: { [section]: "new value" } }
- This will MERGE with existing premise, NOT replace it
- Example: update_world_bible({ projectId: "...", episodePremise: { fatalFlaw: "New flaw text" } })

OPTION 2 (Full regeneration via architect):
- Use 'consult_premise_architect' with task='regenerate_section'
- The tool returns the updated episodePremise - DO NOT call update_world_bible again!
- The response from consult_premise_architect will be emitted as an action for user approval

IMPORTANT:
- Do NOT call both consult_premise_architect AND update_world_bible for the same request
- One tool call is enough - either direct update OR architect consultation
- Multiple tool calls for the same update will cause duplicate actions

Valid sections: protagonistHook, fatalFlaw, stakes, inevitableConsequence, theHook, theTurn, theAftermath, transformation, thematicFocus, logline, title

DO NOT just describe these in text. The user wants them PERSISTED to the database via tool call.
Text-only responses for generation requests are NOT acceptable.

## CRITICAL: ALWAYS GENERATE NEW CONTENT ##
- **NEVER** return the same data that already exists in the World Bible context
- When you see existing data (worldRules, plotTwists, etc.) in the context, treat it as REFERENCE ONLY
- If asked to "generate" or "regenerate", create COMPLETELY NEW and DIFFERENT content
- Your genius creativity should produce fresh, original ideas - not echo what's already there
- If existing rules are [A, B, C], generate [X, Y, Z] - entirely different rules
- Compare your output to existing data before calling the tool - if they match, you FAILED

## ENTITY REFERENCES (CRITICAL FOR CONTEXT) ##
When mentioning ANY named entity in your responses, use markdown-style references:
- **Characters**: [Character Name][char-ID]
- **Locations**: [Place Name][place-ID]
- **Events**: [Event Name][event-ID]
- **Factions**: [Faction Name][faction-ID]
- **Rules**: [Rule Name][rule-ID]
- **Beats**: [Beat Title][beat-ID]

### Example:
"[Marcus][char-001] traveled to [The Citadel][place-002] after [The Great Fire][event-003] destroyed everything he knew. The [Temporal Guardians][faction-004] were watching."

### Reference Format:
- Use IDs from the ENTITIES section in context if available
- If creating a NEW entity not in context, generate a short UUID: [Name][type-abc123]
- Type prefixes: char-, place-, event-, faction-, rule-, beat-, ep-

### Why References Matter:
- Enables smart context injection (only referenced entities included in future prompts)
- Powers hover tooltips in the UI for quick entity lookup
- Allows users to @ mention entities in chat
- Creates a knowledge graph of entity relationships

ALWAYS use entity references for named things. Plain names without references lose valuable context linking.

## Tool Usage Guidelines:
- CRITICAL: Omit optional fields completely if they have no value. Do NOT send 'null' or 'undefined'.
- Always provide the 'projectId' from the SYSTEM CONTEXT.
- For 'manage_beat' (create): 
  - Always provide the 'episodeId' from the SYSTEM CONTEXT.
  - 'emotionalShifts' must be a record: { "CharacterName": { "from": "...", "to": "..." } }

## CRITICAL: NO DUPLICATE TOOL CALLS ##
- Call each tool ONCE per user request
- If a tool succeeds, DO NOT call it again with the same or similar data
- After a successful tool call, respond with a summary - do NOT loop back to call tools again
- If you need to update multiple sections, call the tool ONCE with all sections combined
- Calling the same tool multiple times in a row is a BUG

## Factions Format:
factions: [
  { 
    name: "Faction Name", 
    description: "Detailed description of the faction history and role", 
    ideology: "Core belief", 
    goals: ["Goal 1", "Goal 2"], 
    resources: "Assets/Power they control", 
    weaknesses: "Major weakness", 
    rivals: ["Rival Faction Name"] 
  },
  ...
]

## Plot Twists Format:
plotTwists: [{ title: "...", description: "...", impact: "...", foreshadowing: "..." }, ...]

## World Rules Format:
worldRules: [{ category: "Physics|Magic|Technology|Society|Politics|Economics", rule: "...", consequence: "..." }, ...]

## Inspirations Format (MUST be categorized by type):
inspirations: {
  books: [{ title: "Book Title by Author", description: "Why it's relevant..." }, ...],
  movies: [{ title: "Movie Title (Year)", description: "Why it's relevant..." }, ...],
  games: [{ title: "Game Title (Year)", description: "Why it's relevant..." }, ...]
}
NOTE: DO NOT use a flat array. MUST be an object with books, movies, games keys.

## Soundtracks Format:
soundtracks: [
  { title: "Song Title", artist: "Artist Name", url: "https://www.youtube.com/watch?v=..." },
  ...
]
ALWAYS include the actual YouTube URL. ALWAYS call update_world_bible to persist soundtracks.

Always think cinematically. Every beat should have a visual hook.
After calling tools, provide a brief conversational summary.

## Phase Transitions
Story development follows these phases: premise → breaking → writing → complete

When the user asks to "move to the next phase", "advance", "let's start writing", "let's break the story", or similar:
- From premise → breaking: Call update_story_phase with { episodeId, phase: 'breaking' }
- From breaking → writing: Call update_story_phase with { episodeId, phase: 'writing' }  
- From writing → complete: Call update_story_phase with { episodeId, phase: 'complete' }

ALWAYS use the episodeId from the SYSTEM CONTEXT when calling update_story_phase.`

    // Inject skills into the system prompt
    const m = getMastraInstance()
    try {
      // Get workspace from Mastra
      const workspace = m?.getWorkspace()

      if (workspace && workspace.skills) {
        // List all available skills
        const skillMetas = await workspace.skills.list()

        if (skillMetas.length > 0) {
          systemPromptText +=
            '\n\n# CAPABILITIES & SKILLS\nYou have access to the following specialized capabilities. Use them to enhance your storytelling:\n'

          // Fetch and append each skill's instructions
          for (const meta of skillMetas) {
            const skill = await workspace.skills.get(meta.name)
            if (skill && skill.instructions) {
              systemPromptText += `\n## ${meta.name} Skill\n${skill.instructions}\n`
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load skills for StorytellerAgent:', error)
      // Continue without skills if loading fails
    }

    const storytellerPrompt = {
      name: 'storyteller-system',
      version: 1,
      variables: [] as string[],
      text: systemPromptText,
    }

    // Register/Update the prompt in the repository
    promptRepository.register(storytellerPrompt)
    const instructions = storytellerPrompt.text

    // Pass the singleton mastra instance to the agent
    return new StorytellerAgent({ modelName, mastra: m, enableWorkflowTool }, instructions)
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
    toolChoice: 'auto' | 'none' | 'required' = 'auto',
    options?: { temperature?: number; topP?: number }
  ): Promise<string> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)

    return withSpan(
      id,
      'StorytellerAgent.run',
      async span => {
        const prompt = `Goal: ${goal}\n\nContext:\n${context}`
        const response = await this.agent.generate(prompt, {
          toolChoice,
          // Increase temperature for creative diversity, reduce generic responses
          temperature: options?.temperature ?? 0.85,
          // Higher top_p promotes diverse and original tone shifts
          topP: options?.topP ?? 0.95,
          maxSteps: 5,
          tracingOptions: {
            traceId: id,
            parentSpanId: spanId, // Use our generated spanId which we forced into withSpan
          },
        } as any)
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
      'StorytellerAgent.generateBeat',
      async span => {
        const prompt = `Generate a new story beat for episode ${context.episodeId}.
${context.previousBeat ? `Previous beat: ${context.previousBeat}` : 'This is the opening beat.'}
${context.targetEmotion ? `Target emotional tone: ${context.targetEmotion}` : ''}
Characters involved: ${context.characters.join(', ')}

Create a beat with:
- A compelling logline
- Visual hook
- Clear emotional stakes
- Character advancement`

        return this.run('Generate story beat', prompt, id)
      },
      { ...context, id: spanId }
    )
  }

  /**
   * Check story for continuity issues
   */
  async checkStoryContinuity(beatBoard: any[], traceId?: string): Promise<string> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)

    return withSpan(
      id,
      'StorytellerAgent.checkStoryContinuity',
      async span => {
        return this.run(
          'Check story continuity',
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
      'StorytellerAgent.analyzeCharacterDynamics',
      async span => {
        return this.run(
          'Analyze character dynamics',
          `Analyze the relationship between ${character1} and ${character2}. Consider their goals, fears, and emotional states.`,
          id
        )
      },
      { character1, character2, id: spanId }
    )
  }

  /**
   * Execute a specific tool directly
   */
  async executeTool(
    toolId: string,
    args: Record<string, unknown>,
    traceId?: string
  ): Promise<string> {
    const id = traceId || this.generateHexId(32)
    const spanId = this.generateHexId(16)
    const tool = this.toolsMap[toolId]

    if (!tool) {
      throw new Error(`Tool ${toolId} not found`)
    }

    return withSpan(
      id,
      `StorytellerAgent.tool.${toolId}`,
      async span => {
        const result = await tool.execute({ context: args })
        return typeof result === 'string' ? result : JSON.stringify(result)
      },
      { toolId, args, id: spanId }
    )
  }

  /**
   * Stream response from the agent
   */
  async stream(prompt: string, options?: any) {
    // Use stream() with v2 models (specificationVersion = 'v2' set in createModel)
    const traceId = options?.traceId || this.generateHexId(32)

    return this.agent.stream(prompt, {
      toolChoice: options?.toolChoice || 'auto',
      // Increase temperature for creative diversity, reduce generic responses
      temperature: options?.temperature ?? 0.85,
      // Higher top_p promotes diverse and original tone shifts
      topP: options?.topP ?? 0.95,
      ...options,
      tracingOptions: {
        traceId,
        ...(options?.parentSpanId ? { parentSpanId: options.parentSpanId } : {}),
      },
    } as any)
  }
}

// Factory function for easy instantiation
export async function createStorytellerAgent(
  modelName: string = GLOBAL_AGENT_MODEL,
  enableWorkflowTool: boolean = true
): Promise<StorytellerAgent> {
  return StorytellerAgent.create(modelName, enableWorkflowTool)
}
