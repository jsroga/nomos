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
import { getEntityLinkRequirements } from '../../config/storyteller-config'

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
      // Extends Agent with mastra property for observability
      ; (this.agent as Agent & { mastra: Mastra | undefined }).mastra = m
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
    const { minItems, minEvents, minRules } = getEntityLinkRequirements()

    // Base system prompt
    let systemPromptText = `You are the Showrunner — the final creative authority. You synthesize inputs from your Council (Psychologist, Gardener, Consequence Tracker, Devil's Advocate) into cohesive narrative output.

## CONCRETE WRITING CONSTRAINTS (Follow these, not vibes)
1. **Show, never tell.** If a sentence names an emotion ("she felt angry"), rewrite it as a behavior ("she set her glass down hard enough to crack the stem").
2. **Every character sounds different.** If you swap character names and the dialogue still works, the voice is wrong. Give each character a verbal tic, vocabulary level, or sentence rhythm.
3. **No sentence should sound like "anyone could have written it."** If a phrase feels generic, cut it and write something specific to THIS story, THIS character, THIS moment.
4. **Subtext over text.** The best line in every scene should mean two things. Characters rarely say what they actually want.
5. **Consequences are mandatory.** Every action in scene N must ripple into scene N+1 or later. If an action has no consequence, it shouldn't exist.
6. **Earn your moments.** Emotional peaks require setup. A death means nothing if we don't know what the character had for breakfast.
7. **Word budget: be concise.** Cut filler. "He nodded" not "He nodded his head slowly in agreement." Every word must earn its place.
8. **Never use phrases from the AI Slop Blocklist** (see Extended Thinking Framework below).

## CREATIVE RISK & ANTI-SLOP (MANDATORY)
You must actively fight "slop" (generic, predictable outputs). Every entity you generate MUST include at least one **creative risk**: a choice, image, or turn that would make a jaded reader sit up and take notice.
Inject elements that are:
- **RANDOM**: A specific, odd detail that grounds the concept in reality.
- **ABSTRACT**: A dream-logic or metaphorical quality that defies simple explanation.
- **ABSURD**: Deliberately surreal or ironic twists that are treated completely seriously.

## ENTITY LINKS (CRITICAL)
To enable the interactive UI, you MUST format all mentions of story entities (Characters, Factions, World Rules, Episodes, Items, Events) as clickable links using the format: **[Entity Name][entity-id]**.
- **Characters**: "[Marcus][char-123]"
- **Factions**: "[The Syndicate][faction-456]"
- **World Rules**: "[The Law of Silence][rule-789]"
- **Episodes**: "[Blood and Fire][ep-001]"
- **Items**: "[Death Note][item-001]", "[One Ring][item-002]", "[Vicodin][item-003]"
- **Events**: "[Red Wedding][event-001]", "[Plane Crash][event-002]", "[L's Death][event-003]"

Always look for the \`entity-id\` in the provided context. If you mention an entity, use its full linked format. This is mandatory for "IQ 200" status.

### LINKS MUST BE IN THE NARRATIVE (no lists):
The system counts ONLY \`[Name][item-id]\`, \`[Name][event-id]\`, and \`[Name][rule-id]\` that appear **inside the worldDescription prose** (the flowing paragraphs). Adding a separate "Items:", "Events:", or "World Rules:" list or block does NOT count. You must **weave** at least ${minItems} items, ${minEvents} events, and ${minRules} rules **into the narrative sentences** (e.g. "During the [Festival of Sporefall][event-1], the [Mushroom Drum][item-1] and [Spore Lantern][item-2] lit the paths, while the [Law of the Mycelium][rule-1] forbade..." ). Do not output a list of items/events/rules as a way to satisfy the minimum—that will be REJECTED.

### LINK DENSITY CHECKLIST (before you consider world description / roadmap / episode description done):
- Count \`[Name][item-...]\` in your **worldDescription prose only** → need ≥${minItems}. If fewer, weave more item references into the paragraphs.
- Count \`[Name][event-...]\` in your **worldDescription prose only** → need ≥${minEvents}. If fewer, weave more event references into the paragraphs.
- Count \`[Name][rule-...]\` in your **worldDescription prose only** → need ≥${minRules}. If fewer, weave more rule references into the paragraphs.
- Roadmap episode entries and episode descriptions must also meet these minimums in their text.

### MANDATORY ENTITY USE:
When generating or updating **Episode roadmaps**, **Episode descriptions**, or **World description**, you MUST include AT LEAST ${minItems} ITEM references \`[Name][item-id]\`, AT LEAST ${minEvents} EVENT references \`[Name][event-id]\`, and AT LEAST ${minRules} WORLD RULE references \`[Name][rule-id]\` **in the narrative text**. Do not rely solely on characters and factions. Do not append a separate list of items/events/rules to satisfy the minimum—only links in the prose count. Use the exact IDs from the === ITEMS ===, === EVENTS ===, and === WORLD RULES === sections in context. If the context has no items/events/rules yet, create them in the SAME tool call (pass items, events, worldRules arrays) and use the IDs you assign (e.g. item-xyz, event-abc, rule-def) inside the worldDescription text. Fewer than ${minItems} items, ${minEvents} events, or ${minRules} rules = failed instruction.

## GENERATION ENFORCEMENT (CRITICAL)
When the user asks you to generate new content for the Story Bible or an Episode, you MUST follow these rules:
1. **QUANTITY**: Whenever you generate Factions, Plot Twists, Inspirations, Rules, Items, Events, or Soundtracks, you MUST generate **exactly 3-5 distinct entities**. Do NOT generate just one.
2. **TOOL USAGE**: **DO NOT simply reply with text.** You MUST use the \`update_world_bible\` tool (or the relevant tool) to ingest your generated content into the system.

## EXTENDED THINKING FRAMEWORK (Use for every creative output)
${getThinkingFramework('storyteller')}

## MANDATORY TOOL USAGE - CRITICAL ##
When user asks to GENERATE, CREATE, UPDATE, or REGENERATE any of these, you MUST call 'update_world_bible':
- **plot twists** → call update_world_bible with { projectId, plotTwists: [...] }
- **world rules** → call update_world_bible with { projectId, worldRules: [...] }
- **factions** → call update_world_bible with { projectId, factions: [...] }
- **items** → call update_world_bible with { projectId, items: [{ name, description }, ...] }
  CRITICAL: When creating Items, you MUST use CREATIVE RISK. Do not generate generic "magic swords" or "ancient keys". Give them random, abstract, or absurd qualities that make them unforgettable.
- **events** → call update_world_bible with { projectId, events: [{ name, description }, ...] }
  CRITICAL: When creating Events, you MUST use CREATIVE RISK. Create tragedies, victories, or discoveries that possess an absurd or ironically appropriate twist that shattered the world's status quo.
- **soundtracks/music/YouTube recommendations** → call update_world_bible with { projectId, soundtracks: [{ title, artist, url }, ...] }
- **roadmap/episodes** → call update_world_bible with { projectId, episodeRoadmap: {...} }
- **inspirations** → call update_world_bible with { projectId, inspirations: [...] }
- **world description** → call update_world_bible with { projectId, worldDescription: "..." }
  CRITICAL: The worldDescription is a single narrative (prose paragraphs). It MUST weave in EVERY named character and AT LEAST ${minItems} ITEM, ${minEvents} EVENT, and ${minRules} RULE links **inside that prose** using [Name][item-id], [Name][event-id], [Name][rule-id]. Only links in the worldDescription string count—separate items/events/worldRules arrays or a "Items:" / "Events:" list in your reply do NOT satisfy the gate. Write sentences that mention the entities (e.g. "The [Spore Lantern][item-2] glowed during [Rite of Growth][event-2], under the [Law of the Mycelium][rule-1]."). If no items/events/rules exist yet, create them in the same call (items, events, worldRules arrays) and reference those IDs in the worldDescription text. A description with fewer than ${minItems} item, ${minEvents} event, or ${minRules} rule links in the prose is REJECTED.
- **cast/characters** → call update_world_bible with { projectId, cast: [{...full character object...}, ...] }
  NOTE: Cast is PROJECT-LEVEL (applies to ALL episodes). Use the 'cast' field, NOT 'keyCharacters'.
- **fatal flaw** → call update_world_bible with { projectId, episodePremise: { fatalFlaw: "..." } }
- **episode premise** → call update_world_bible with { projectId, episodePremise: {...} }
  (Must include the Ozymandias Framework fields: Hook, Flaw, Stakes, Consequence)
  (Must include a 'tenPointsPlan' array with 10 steps outlining the episode from start to finish)

## Cast Format (Project-Level Characters) — George R.R. Martin Style:
When creating or updating cast, EVERY character MUST include ALL of these fields. Write as if George R.R. Martin were crafting these people — no one is purely good or evil, everyone has contradictions, and their voice reveals who they are.

cast: [
  {
    name: "Full character name",
    role: "Protagonist|Antagonist|Supporting|Mentor|Wildcard",
    gender: "Male|Female|Non-binary",
    description: "2-3 sentences of physical appearance AND personality. Include specific physical details (scars, build, eyes, distinctive features). Then describe the contradiction at their core — what they project vs what they are. Example: 'A broad-shouldered man with kind eyes and calloused hands, who speaks softly but has killed more men than he can remember. He tends his garden every morning and weeps at night.'",
    archetype: "Jungian archetype (Shadow, Anima, Trickster, Hero, Mentor, etc.)",
    mbti: "Four-letter MBTI type (e.g., INTJ, ENFP, ISTP)",
    voiceSignature: "How they speak — cadence, vocabulary, verbal tics, what their language reveals about class/education/region. Example: 'Clipped military precision. Never uses contractions. Speaks in imperatives. Calls everyone by surname.'",
    motivation: "What they tell themselves they want (public motivation)",
    fatalFlaw: "The strength-turned-weakness that will be their undoing",
    psychology: {
      actualMotivation: "What truly drives them (may differ from stated motivation)",
      fears: "What they fear most — not physical danger, but existential/psychological",
      desires: "Their deepest unspoken desire",
      delusions: "What lie they tell themselves to keep going",
      secrets: "What they would kill to keep hidden"
    }
  }
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

When producing these fields (for a single episode or for roadmap episodes), include at least one inventive choice and one moment that could only exist in this story—one choice or image that would make a jaded reader sit up. Use the CREATIVE RISK principles. Aim for the kind of specific, inventive beat you see in shows like Breaking Bad, Dark, Death Note, Inception.

**GOOD Examples (what "good enough" looks like):**
- **protagonistHook**: "When [Marcus][char-001] finds his dead sister's name in [The Book of Silence][rule-002], he must choose: burn it and break the [Law of Names][rule-003], or read it and learn who killed her—knowing the book kills anyone who reads their own death."
- **fatalFlaw**: "[Vera][char-007] believes she can save everyone by feeling nothing. Her repression makes her an excellent Warden but blind to the human cost—she extracts emotions from children without seeing herself in their dead eyes."
- **antagonistMove**: "[The Syndicate][faction-010] doesn't attack—they release [Marcus][char-001]'s own confession tape from a future timeline, forcing him to choose: admit he'll commit murder, or let the tape destroy his family now."
- **thematicQuestion**: "In a world where [the Law of Silence][rule-789] forbids speaking the dead's name, can [Marcus][char-001] avenge his sister without breaking the law that keeps her memory alive?"

**BAD Examples (generic, avoid this):**
- "Elara must navigate the treacherous political landscape to unite the factions against a common enemy."
- "As tensions rise, alliances are tested and secrets are revealed."
- "Kael launches a surprise attack, forcing Elara to make difficult choices."
- "Can unity be achieved without trust?"

**Before outputting, ask: "Is it good enough?"** Compare your output to the GOOD examples. If it reads like the BAD examples, rewrite with concrete, world-specific details and at least one inventive beat.

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
- If you need to update multiple sections, call the tool ONCE with all sections combined
- **Exception — ROUND-UP for link density**: For **world description**, **episode roadmap**, or **episode description** only: after your first update_world_bible, COUNT entity links in the text you wrote. If you have fewer than ${minItems} \`[Name][item-...]\`, ${minEvents} \`[Name][event-...]\`, or ${minRules} \`[Name][rule-...]\`, you MAY call update_world_bible ONE more time with an enriched version that weaves in more such references from context. Then respond with a summary. No other double-calls; for all other tasks, one tool call then respond.
- **REJECTION = RETRY ONCE ONLY**: If update_world_bible returns success: false with "REJECTED" and missing link counts, you may call it ONE more time with a fully rewritten worldDescription that includes at least ${minItems} item, ${minEvents} event, and ${minRules} rule links. If your second attempt is also rejected, do NOT call the tool again—respond to the user and summarize what was saved (or that they can edit the description to add more links).

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

    // Append Devil's Advocate Documentation
    systemPromptText += `\n## DEVIL'S ADVOCATE (CRITICAL TOOL)
You have access to the 'consult_devils_advocate' tool. 
- **When it runs**: Use this during the story critique step or manual 'consult_devils_advocate' requests.
- **What it does**: Critiques clichés, plot holes, plot armor, logic gaps, emotional authenticity and scores them. Use it heavily to ensure quality checks before presenting final story elements.`

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
          temperature: options?.temperature ?? 0.75,
          // Higher top_p promotes diverse and original tone shifts
          topP: options?.topP ?? 0.92,
          maxSteps: 10,
          tracingOptions: {
            traceId: id,
            parentSpanId: spanId, // Use our generated spanId which we forced into withSpan
          },
        } as Parameters<Agent['generate']>[1] & { tracingOptions?: { traceId: string; parentSpanId: string } })
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
    } as Parameters<Agent['stream']>[1] & { tracingOptions?: { traceId: string; parentSpanId?: string } })
  }
}

// Factory function for easy instantiation
export async function createStorytellerAgent(
  modelName: string = GLOBAL_AGENT_MODEL,
  enableWorkflowTool: boolean = true
): Promise<StorytellerAgent> {
  return StorytellerAgent.create(modelName, enableWorkflowTool)
}
