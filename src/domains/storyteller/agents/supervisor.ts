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
    'planner',
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
    'delegate_to_planner': 'planner',
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
## YOUR ROLE: THE SUPERVISOR (PROJECT MANAGER)
You are the manager of a Writers Room. Your job is to **PLAN** and **DELEGATE**.


## DEEP AGENT WORKFLOW (PLANNER-EXECUTOR)
1. **ANALYZE**: Is the request "Atomic" (single step) or "Complex" (multi-step)?
   - **Atomic**: "Generate episode premise", "Create character X", "What do you think?". -> **EXECUTE DIRECTLY**.
   - **Complex**: "Create a whole season arc", "Build 5 factions", "Write the whole script". -> **PLAN FIRST**.

2. **EXECUTE DIRECTLY**: If Atomic, delegate to the specific specialist immediately. DO NOT call the Planner.

3. **PLAN**: If Complex and no plan exists, delegate to \`delegate_to_planner\`.

4. **EXECUTE PLAN**: If a plan exists, look for the next "pending" task.
   - Delegate that specific task to the appropriate specialist.
   - You can execute multiple tasks in PARALLEL if they are independent.

5. **REVIEW**: When a worker finishes, the task is marked complete. Check the plan again.

## TEAM MEMBERS (TOOLS)
- **Planner**: The Architect. Creates the \`ActionPlan\`. CALL THIS FIRST for any complex request.
- **Plot Architect**: [BREAKING] Structure & Beats.
- **Character Psychology**: [BREAKING] Character logic.
- **Consequence Tracker**: [BREAKING] Continuity.
- **Devil's Advocate**: [BREAKING/CARDLOCK] Critique.
- **Writer**: [WRITING] Script writing.
- **Script Editor**: [WRITING] Script review.
- **Premise Architect**: [PREMISE] World building.
- **Episode Premise Architect**: [PREMISE] Episode hooks.
- **Magic Agent**: Chaos/Ideas.
- **Search Bible**: Fact lookup.

## ROUTING LOGIC
- **"Make a world and characters"** -> **Planner** (Needs breakdown).
- **"Generate episode premise"** or **"Generate premise for this episode"** (any wording containing both "episode" and "premise") -> **Episode Premise Architect** (Direct delegation, regardless of phase).
- **"Write the script"** (Premise done) -> **Planner** (Needs breakdown).
- **"What do you think?"** -> **Answer directly**.
- **"Change the protagonist's name"** -> **Premise Architect** (Simple task, no plan needed).

## SEQUENTIAL EXECUTION
Execute one task at a time. Wait for the result before starting the next one.
DO NOT call multiple tools in the same turn.

## CRITICAL INSTRUCTION
- ALWAYS check \`state.plan\` first.
- If \`state.plan\` has pending items, prioritize executing them.
- If user input ignores the plan, you may cancel the plan or re-plan.
`


export const supervisorAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const model = getModel('showrunner')
  const supervisorModel = model.bindTools(supervisorTools, { parallel_tool_calls: false })

  console.log(
    'Supervisor evaluating... (phase:',
    state.currentPhase,
    ', iteration:',
    state.phaseIterations,
    ')'
  )

  // CIRCUIT BREAKER: If previous agent requested user input, respect it and stop.
  if (state.awaitingUserInput) {
    console.log('Supervisor: Previous step requested user input. Stopping loop.')
    return { awaitingUserInput: true }
  }

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
    const transitionKey = `${state.currentPhase} -> ${nextPhase} `
    const checkFn = PHASE_TRANSITION_CONDITIONS[transitionKey]
    if (checkFn) {
      const { canAdvance, reason } = checkFn(state)
      if (canAdvance) {
        transitionInfo = `\n\n ** READY TO ADVANCE:** You can move to ${nextPhase.toUpperCase()} phase.${reason} `
      } else {
        transitionInfo = `\n\n ** PHASE PROGRESS:** ${reason} `
      }
    }
  }

  // --- PLAN CONTEXT ---
  let planContext = ''
  if (state.plan && state.plan.length > 0) {
    const pending = state.plan.filter(p => p.status === 'pending');
    const inProgress = state.plan.filter(p => p.status === 'in_progress');
    const completed = state.plan.filter(p => p.status === 'complete');

    planContext = `
## CURRENT ACTION PLAN
Completed: ${completed.length} | Pending: ${pending.length}

** NEXT PENDING TASKS(Prioritize These):**
  ${pending.slice(0, 3).map(p => `- [${p.id}] ${p.description} -> Delegate to ${p.assignedAgent}`).join('\n')}

** Note:** If you see tasks with the same logic that can be done in parallel, you can call multiple tools.
`
  }
  // --------------------


  // --- EPISODE CONTEXT ---
  let episodeContext = ''
  if (state.episodeId && state.episodeId.length > 5) {
    episodeContext = `
## 🚨 ACTIVE CONTEXT: EPISODE MODE
The user has an ACTIVE EPISODE open (ID: ${state.episodeId}).
- Default ALL "premise", "plot", or "beat" requests to THIS EPISODE.
- Do NOT edit the Series Bible unless explicitly asked.
- Use **Episode Premise Architect** for premise generation.
`
  }
  // --------------------

  const phaseContext = `
## CURRENT PHASE: ${state.currentPhase.toUpperCase()}
${phaseGuidance}

** Allowed agents in this phase:** ${allowedAgents.join(', ')}
${transitionInfo}

${episodeContext}
${planContext}
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

      // CIRCUIT BREAKER: Check if we are looping (delegating to same agent repeatedly)
      const lastAction = state.lastAction
      const lastMessage = state.messages[state.messages.length - 1] as AIMessage
      const lastToolCall = lastMessage?.tool_calls?.[0]?.name

      // If we just called this tool, and we are calling it again immediately...
      // We need to be careful. The graph cycle is Supervisor -> Tool -> Supervisor.
      // So "lastAction" might be the tool execution.
      // Let's check if the previous message from Supervisor (2 steps back) was the same tool call.

      const previousSupervisorMsg = state.messages[state.messages.length - 3] as AIMessage
      const previousToolCall = previousSupervisorMsg?.tool_calls?.[0]?.name

      if (previousToolCall === toolName && !awaitingUserInput) {
        console.warn(`Supervisor: CIRCUIT BREAKER - Detected potential loop with ${toolName}`)
        // Force a pause
        response.content = `I notice we might be going in circles with ${toolName}. Let's pause and review.`
        response.tool_calls = undefined
        awaitingUserInput = true
      }

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

