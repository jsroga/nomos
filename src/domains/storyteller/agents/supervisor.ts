import { WritersRoomState, Phase } from '../graph/state'
import { AIMessage, SystemMessage, HumanMessage } from '@langchain/core/messages'
import { assembleContext } from '../context/assembler'
import { getModel } from '../config/model-config'
import { supervisorTools } from '../tools/agent-tools'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

// ==================================================================
// PHASE-AWARE ROUTING CONFIGURATION
// ==================================================================

/**
 * Maps each phase to the agents that are allowed to operate in that phase.
 * This enforces the workflow: premise -> breaking -> cardlock -> writing -> complete
 */
export const PHASE_ALLOWED_AGENTS: Record<Phase, string[]> = {
  premise: [
    'premiseArchitect',
    'episodePremiseArchitect',
    'magicAgent',
    'search_series_bible',
  ],
  breaking: [
    'plotArchitect',
    'characterPsychology',
    'consequenceTracker',
    'devilsAdvocate',
    'magicAgent',
    'premiseArchitect', // Allow bible updates during breaking
    'search_series_bible',
  ],
  cardlock: [
    'devilsAdvocate',
    'writer',
    'scriptEditor',
    'search_series_bible',
  ],
  writing: [
    'writer',
    'scriptEditor',
    'search_series_bible',
  ],
  complete: [
    'search_series_bible', // Only lookup allowed
  ],
}

/**
 * Conditions that must be met to advance from one phase to the next.
 */
export const PHASE_TRANSITION_CONDITIONS: Record<string, (state: WritersRoomState) => { canAdvance: boolean; reason: string }> = {
  'premise -> breaking': (state) => {
    const bible = state.seriesBible || {}
    const storyPlan = bible.storyPlan || bible

    const hasWorldDescription = !!storyPlan.worldDescription || !!bible.worldDescription
    const hasFactions = (storyPlan.factions?.length || bible.factions?.length || 0) >= 1
    const hasCharacters = (storyPlan.keyCharacters?.length || bible.keyCharacters?.length || 0) >= 1

    if (!hasWorldDescription) {
      return { canAdvance: false, reason: 'Need world description before breaking story' }
    }
    if (!hasFactions) {
      return { canAdvance: false, reason: 'Need at least one faction defined' }
    }
    if (!hasCharacters) {
      return { canAdvance: false, reason: 'Need at least one character defined' }
    }

    return { canAdvance: true, reason: 'Premise complete - ready for beat breaking' }
  },

  'breaking -> cardlock': (state) => {
    const approvedBeats = state.beatBoard.filter(b => b.status === 'approved' || b.status === 'locked')

    if (approvedBeats.length < 3) {
      return { canAdvance: false, reason: `Need at least 3 approved beats (have ${approvedBeats.length})` }
    }

    return { canAdvance: true, reason: 'Enough beats approved - ready to lock cards' }
  },

  'cardlock -> writing': (state) => {
    const lockedBeats = state.beatBoard.filter(b => b.status === 'locked')
    const totalBeats = state.beatBoard.length

    if (totalBeats === 0) {
      return { canAdvance: false, reason: 'No beats to lock' }
    }

    // Allow if at least 50% of beats are locked, or all approved beats are locked
    const approvedOrLocked = state.beatBoard.filter(b => b.status === 'approved' || b.status === 'locked')
    if (lockedBeats.length < approvedOrLocked.length) {
      return { canAdvance: false, reason: `Lock all approved beats before writing (${lockedBeats.length}/${approvedOrLocked.length} locked)` }
    }

    return { canAdvance: true, reason: 'Beat board locked - ready to write script' }
  },

  'writing -> complete': (state) => {
    const hasScript = state.script && state.script.trim().length > 100
    const scriptApproved = state.lastScriptVerdict === 'PASS'

    if (!hasScript) {
      return { canAdvance: false, reason: 'No script content yet' }
    }
    if (!scriptApproved) {
      return { canAdvance: false, reason: 'Script not yet approved by editor' }
    }

    return { canAdvance: true, reason: 'Script complete and approved!' }
  },
}

/**
 * Check if an agent is allowed in the current phase
 */
export function isAgentAllowedInPhase(agentName: string, phase: Phase | string): boolean {
  // Special case: 'world_building' phase allows all agents (working on series bible)
  if (phase === 'world_building') {
    return true
  }

  const allowedAgents = PHASE_ALLOWED_AGENTS[phase as Phase] || []
  // Map tool names to agent names for lookup
  const toolToAgent: Record<string, string> = {
    'delegate_to_plot_architect': 'plotArchitect',
    'delegate_to_character_psychology': 'characterPsychology',
    'delegate_to_consequence_tracker': 'consequenceTracker',
    'delegate_to_devils_advocate': 'devilsAdvocate',
    'delegate_to_writer': 'writer',
    'delegate_to_premise_architect': 'premiseArchitect',
    'delegate_to_episode_premise_architect': 'episodePremiseArchitect',
    'delegate_to_magic_agent': 'magicAgent',
    'delegate_to_script_editor': 'scriptEditor',
    'search_series_bible': 'search_series_bible',
  }

  const resolvedAgent = toolToAgent[agentName] || agentName
  return allowedAgents.includes(resolvedAgent)
}

/**
 * Get phase guidance message for the user
 */
export function getPhaseGuidance(state: WritersRoomState): string {
  const phase = state.currentPhase

  const phaseDescriptions: Record<Phase, string> = {
    premise: `📋 **PREMISE PHASE**: Build your world bible - define world rules, factions, and characters. Use the Premise Architect to create your foundation.`,
    breaking: `🎬 **BREAKING PHASE**: Create story beats using the Plot Architect. Challenge them with Devil's Advocate. Build your episode structure.`,
    cardlock: `🔒 **CARD LOCK PHASE**: Review and finalize beats. Lock the beat board when ready. Start writing scenes.`,
    writing: `✍️ **WRITING PHASE**: Transform beats into screenplay. The Script Editor will review your work.`,
    complete: `✅ **COMPLETE**: Episode finished! Start a new episode or export your work.`,
  }

  return phaseDescriptions[phase] || ''
}

const SUPERVISOR_SYSTEM_PROMPT = `
## YOUR ROLE: THE SUPERVISOR
You are the manager of a Writers Room. Your job is to **DELEGATE** work to specialized agents.
You do NOT write the story yourself. You DO NOT create beats yourself. You route tasks.

## TEAM MEMBERS (TOOLS)
- **Plot Architect**: Creates and edits beats. The primary builder. [BREAKING phase]
- **Character Psychology**: Checks character logic. [BREAKING phase]
- **Consequence Tracker**: Checks continuity. [BREAKING phase]
- **Devil's Advocate**: Critiques and stress-tests. [BREAKING, CARDLOCK phases]
- **Writer**: Writes actual script scenes. [CARDLOCK, WRITING phases]
- **Script Editor**: Reviews and critiques script quality. [CARDLOCK, WRITING phases]
- **Premise Architect**: Builds the world bible and premise. [PREMISE, BREAKING phases]
- **Episode Premise Architect**: Creates episode-level premises. [PREMISE phase]
- **Magic Agent**: Throws random absurd suggestions to add spice and chaos. [PREMISE, BREAKING phases]
- **Search Bible**: Looks up details in the Series Bible. [ALL phases]

## PHASE-BASED WORKFLOW
The story development follows phases: PREMISE → BREAKING → CARDLOCK → WRITING → COMPLETE

**Phase Rules:**
- PREMISE: Focus on world-building. Use Premise Architect, Episode Premise Architect.
- BREAKING: Create story beats. Use Plot Architect, Character Psychology, Devil's Advocate.
- CARDLOCK: Review and lock beats. Start writing scenes with Writer.
- WRITING: Full screenplay mode. Writer and Script Editor only.
- COMPLETE: Episode finished.

**IMPORTANT:** If user requests an agent not allowed in current phase, explain the workflow and suggest the appropriate action.

## ROUTING RULES (ACTION OVER CONVERSATION)

### 1. BIBLE SECTION UPDATES (IMPORTANT - NEW CAPABILITY)
The Premise Architect now supports **intelligent section-specific updates with smart merging**.
When user wants to update a SPECIFIC part of the bible, route to \`delegate_to_premise_architect\`:
- **"Update the world rules"** / **"Regenerate laws of the world"** / **"Add more rules"**
- **"Update the factions"** / **"Add a new faction"** / **"Regenerate power & factions"**
- **"Update inspirations"** / **"Add more movie references"**
- **"Generate plot twists"** / **"Update the twists"**
- **"Create episode roadmap"** / **"Update the season arc"**
- **"Update key characters"** / **"Add more characters"**
- **"Regenerate world description"** / **"Make the world more vivid"**

Pass the user's EXACT request as the instruction. The Premise Architect will:
1. Detect which section to update
2. Use focused prompts for that section only
3. Smart merge new content with existing content (won't delete existing entries)

### 2. Rejection
If the user says "No", "I hate it", or "Change it", DO NOT APOLOGIZE. 
- Call \`delegate_to_plot_architect\` with the instruction: "Revise the previous beat based on feedback: [User's Feedback]".

### 3. Creative Direction
If user says "Make it darker", "Add a dragon", or "Change setting":
- Call \`delegate_to_plot_architect\` (for story/beat changes) 
- Call \`delegate_to_premise_architect\` (for world/bible changes)

### 4. Multi-Step Requests
If user says "Create a character AND kill them":
- Pick the FIRST logical tool to start the chain (e.g. \`delegate_to_premise_architect\` to add the character).

### 5. Phase Changes
"Go to writing": Call \`delegate_to_writer\`.

### 6. Recall
"What is the magic system?" or "Who is Bob?": Call \`search_series_bible\` to find the answer.

### 7. Opinion
"What do you think?", "What's next?":
- ANSWER DIRECTLY. Do NOT call a tool unless you need to look up facts.
- EXCEPTION: If the user is stuck and asks "What next?", you CAN call \`delegate_to_plot_architect\` to propose a beat.

### 8. Chaos & Spice
If the user asks to "spice things up", "add something random", "make it weird", "throw in something absurd":
- Call \`delegate_to_magic_agent\` - they will inject random absurd events and suggestions.
- Use this when scenes feel too predictable or need comedic relief.

## CRITICAL INSTRUCTION
- If the user gives ANY instruction to create/edit content, you **MUST** call a tool.
- Do NOT reply with "I will do that" or "Understood". Call the tool!
- Use the context provided in the message history to formulate the tool instruction.
- For bible updates: Pass the user's request verbatim - the Premise Architect will handle section detection.

## EMPTY STATE OVERRIDE
- If the **Series Bible is EMPTY**:
  - **CASE A (COMMAND)**: If user says "Start", "Go", "Make it sci-fi", or gives creative direction:
    - **IMMEDIATELY CALL** \`delegate_to_premise_architect\` with the instruction: "Generate a compelling initial premise and world rules from scratch."
    - It is better to generate a draft than to stall.
  - **CASE B (QUESTION)**: If user asks a QUESTION ("What do you think?", "Why?"):
    - **ANSWER DIRECTLY**. Do not delegate. Engage in conversation to clarify their vision.
`

export const supervisorAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const model = getModel('showrunner')
  const supervisorModel = model.bindTools(supervisorTools)

  console.log(
    'Supervisor evaluating... (phase:',
    state.currentPhase,
    ', iteration:',
    state.phaseIterations,
    ')'
  )

  const context = assembleContext(state, 'showrunner') // Reusing showrunner context builder

  // Context Fix: Ensure last user message is always present
  const lastMessage = state.messages[state.messages.length - 1];
  const lastHumanMessage = state.messages.slice().reverse().find(m => m._getType() === 'human');

  // Build phase context
  const phaseGuidance = getPhaseGuidance(state)
  const allowedAgents = PHASE_ALLOWED_AGENTS[state.currentPhase] || []

  // Check phase transition eligibility
  const nextPhaseMap: Record<Phase, Phase | null> = {
    premise: 'breaking',
    breaking: 'cardlock',
    cardlock: 'writing',
    writing: 'complete',
    complete: null,
  }
  const nextPhase = nextPhaseMap[state.currentPhase]
  let transitionInfo = ''

  if (nextPhase) {
    const transitionKey = `${state.currentPhase} -> ${nextPhase}`
    const checkFn = PHASE_TRANSITION_CONDITIONS[transitionKey]
    if (checkFn) {
      const { canAdvance, reason } = checkFn(state)
      if (canAdvance) {
        transitionInfo = `\n\n**READY TO ADVANCE:** You can move to ${nextPhase.toUpperCase()} phase. ${reason}`
      } else {
        transitionInfo = `\n\n**PHASE PROGRESS:** ${reason}`
      }
    }
  }

  const phaseContext = `
## CURRENT PHASE: ${state.currentPhase.toUpperCase()}
${phaseGuidance}

**Allowed agents in this phase:** ${allowedAgents.join(', ')}
${transitionInfo}
`

  // Combine all system content into a single SystemMessage (required for Claude)
  const combinedSystemContent = [
    context.systemPrompt,
    context.stateContext,
    SUPERVISOR_SYSTEM_PROMPT,
    phaseContext,
  ].join('\n\n---\n\n')

  // Filter out any SystemMessages from conversation history (Claude doesn't allow them mid-conversation)
  const conversationMessages = state.messages
    .slice(-10)
    .filter(m => m._getType() !== 'system')

  const messages = [
    new SystemMessage(combinedSystemContent),
    ...conversationMessages,
  ];

  // If the last message in the slice isn't the user's command (due to system logs stuffing context),
  // forcefully append it to ensure the LLM sees the command.
  if (lastHumanMessage && !messages.includes(lastHumanMessage as any)) {
    if (lastMessage !== lastHumanMessage) {
      console.log("Supervisor: Re-injecting user command into context.");
      messages.push(new HumanMessage({ content: `(User's last command: "${lastHumanMessage.content}")` }));
    }
  }

  try {
    // Invoke the model with tools bound
    const response = await supervisorModel.invoke(messages)

    // Interaction Fix: If NO tool calls, we assume the agent is talking to the user.
    // Therefore, we must pause for user input.
    let awaitingUserInput = false;
    let phaseUpdate: Partial<WritersRoomState> = {};

    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log("Supervisor: No tool calls -> Pausing for user input.");
      awaitingUserInput = true;

      // Format JSON content as readable message if the model returned JSON
      let content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

      // Try to parse and extract message if it's JSON
      try {
        const parsed = JSON.parse(content)
        if (parsed.message) {
          content = parsed.message
        }
      } catch {
        // Not JSON, use as-is
      }

      // Update response content with formatted message
      response.content = content
    } else {
      // Check if tool call is allowed in current phase
      const toolName = response.tool_calls[0].name
      const isAllowed = isAgentAllowedInPhase(toolName, state.currentPhase)

      if (!isAllowed) {
        console.log(`Supervisor: Tool ${toolName} not allowed in ${state.currentPhase} phase`)

        // Instead of blocking, add a warning and let it proceed
        // The user might want to override phase restrictions
        const warningContent = `⚠️ **Phase Warning:** ${toolName} is typically used in a different phase. Current phase: ${state.currentPhase.toUpperCase()}\n\nProceeding anyway...`
        response.content = warningContent
      } else if (!response.content) {
        // STREAMING FIX: If tool calls exist but content is empty, inject a message so the UI shows something.
        const toolNames = response.tool_calls.map(tc => tc.name).join(', ');
        response.content = `Delegating to ${toolNames}...`;
      }

      // Check for automatic phase transitions based on user commands
      const userCommand = lastHumanMessage?.content?.toString().toLowerCase() || ''

      // Auto-advance phase commands
      if (userCommand.includes('start breaking') || userCommand.includes('move to breaking')) {
        const check = PHASE_TRANSITION_CONDITIONS['premise -> breaking']?.(state)
        if (check?.canAdvance && state.currentPhase === 'premise') {
          console.log('Auto-advancing to breaking phase')
          phaseUpdate = { currentPhase: 'breaking' as Phase }
        }
      } else if (userCommand.includes('lock cards') || userCommand.includes('start writing')) {
        const check = PHASE_TRANSITION_CONDITIONS['breaking -> cardlock']?.(state)
        if (check?.canAdvance && state.currentPhase === 'breaking') {
          console.log('Auto-advancing to cardlock phase')
          phaseUpdate = { currentPhase: 'cardlock' as Phase }
        }
      } else if (userCommand.includes('go to writing') || userCommand.includes('write the script')) {
        const check = PHASE_TRANSITION_CONDITIONS['cardlock -> writing']?.(state)
        if (check?.canAdvance && state.currentPhase === 'cardlock') {
          console.log('Auto-advancing to writing phase')
          phaseUpdate = { currentPhase: 'writing' as Phase }
        }
      }
    }

    return {
      messages: [response],
      awaitingUserInput,
      ...phaseUpdate,
      // We don't set lastAction here because the tool execution will determine the next state
    }
  } catch (error) {
    console.error('Supervisor error:', error)
    const errorMessage = new AIMessage({
      content: `⚠️ **Error**: ${error instanceof Error ? error.message : 'Unknown error'}`,
      name: 'Supervisor',
    })
    return {
      messages: [errorMessage],
      shouldTerminate: true,
    }
  }
}

