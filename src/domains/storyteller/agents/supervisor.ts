import { WritersRoomState, Phase } from '../graph/state'
import { AIMessage, SystemMessage, HumanMessage } from '@langchain/core/messages'
import { buildAgentContext } from '../utils/context-builder'
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
    'planner',
  ],
  cardlock: ['devilsAdvocate', 'writer', 'scriptEditor', 'search_series_bible', 'planner'],
  writing: ['writer', 'scriptEditor', 'search_series_bible', 'planner'],
  complete: [
    'search_series_bible', // Only lookup allowed
  ],
}

/**
 * Conditions that must be met to advance from one phase to the next.
 */
export const PHASE_TRANSITION_CONDITIONS: Record<
  string,
  (state: WritersRoomState) => { canAdvance: boolean; reason: string }
> = {
  'premise -> breaking': state => {
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

  'breaking -> cardlock': state => {
    const approvedBeats = state.beatBoard.filter(
      b => b.status === 'approved' || b.status === 'locked'
    )

    if (approvedBeats.length < 3) {
      return {
        canAdvance: false,
        reason: `Need at least 3 approved beats (have ${approvedBeats.length})`,
      }
    }

    return { canAdvance: true, reason: 'Enough beats approved - ready to lock cards' }
  },

  'cardlock -> writing': state => {
    const lockedBeats = state.beatBoard.filter(b => b.status === 'locked')
    const totalBeats = state.beatBoard.length

    if (totalBeats === 0) {
      return { canAdvance: false, reason: 'No beats to lock' }
    }

    // Allow if at least 50% of beats are locked, or all approved beats are locked
    const approvedOrLocked = state.beatBoard.filter(
      b => b.status === 'approved' || b.status === 'locked'
    )
    if (lockedBeats.length < approvedOrLocked.length) {
      return {
        canAdvance: false,
        reason: `Lock all approved beats before writing (${lockedBeats.length}/${approvedOrLocked.length} locked)`,
      }
    }

    return { canAdvance: true, reason: 'Beat board locked - ready to write script' }
  },

  'writing -> complete': state => {
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
    delegate_to_plot_architect: 'plotArchitect',
    delegate_to_character_psychology: 'characterPsychology',
    delegate_to_consequence_tracker: 'consequenceTracker',
    delegate_to_devils_advocate: 'devilsAdvocate',
    delegate_to_writer: 'writer',
    delegate_to_premise_architect: 'premiseArchitect',
    delegate_to_episode_premise_architect: 'episodePremiseArchitect',
    delegate_to_magic_agent: 'magicAgent',
    delegate_to_script_editor: 'scriptEditor',
    delegate_to_planner: 'planner',
    search_series_bible: 'search_series_bible',
  }

  const resolvedAgent = toolToAgent[agentName] || agentName

  // Specific override: allow Plot Architect to be called during Premise phase if it's for story breaking
  // This avoids the annoying warning when the user says "break into beats"
  if (resolvedAgent === 'plotArchitect' && phase === 'premise') {
    return true
  }

  return allowedAgents.includes(resolvedAgent)
}

/**
 * Get phase guidance message for the user
 */
export function getPhaseGuidance(state: WritersRoomState): string {
  const phase = state.currentPhase

  const phaseDescriptions: Record<Phase, string> = {
    premise:
      '📋 **PREMISE PHASE**: Build your world bible - define world rules, factions, and characters. Use the Premise Architect to create your foundation.',
    breaking:
      '🎬 **BREAKING PHASE**: Create story beats using the Plot Architect. Challenge them with Devil\'s Advocate. Build your episode structure.',
    cardlock:
      '🔒 **CARD LOCK PHASE**: Review and finalize beats. Lock the beat board when ready. Start writing scenes.',
    writing:
      '✍️ **WRITING PHASE**: Transform beats into screenplay. The Script Editor will review your work.',
    complete: '✅ **COMPLETE**: Episode finished! Start a new episode or export your work.',
  }

  return phaseDescriptions[phase] || ''
}

import { SUPERVISOR_SYSTEM_PROMPT } from '../prompts/agents/supervisor'
import { loadPromptCached } from '../prompts/hub-loader'

export const supervisorAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const model = getModel('showrunner')

  // FORCE tool usage - supervisor MUST delegate, never answer directly
  const supervisorModel = model.bindTools(supervisorTools, {
    parallel_tool_calls: false,
    tool_choice: 'required', // Forces the model to ALWAYS use a tool
  })

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

  const contextXml = buildAgentContext(state, 'general')

  // Context Fix: Ensure last user message is always present
  const lastMessage = state.messages[state.messages.length - 1]
  const lastHumanMessage = state.messages
    .slice()
    .reverse()
    .find(m => m._getType() === 'human')

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
    const pending = state.plan.filter(p => p.status === 'pending')
    const inProgress = state.plan.filter(p => p.status === 'in_progress')
    const completed = state.plan.filter(p => p.status === 'complete')

    planContext = `
## CURRENT ACTION PLAN
Completed: ${completed.length} | Pending: ${pending.length}

** NEXT PENDING TASKS(Prioritize These):**
  ${pending
    .slice(0, 3)
    .map(p => `- [${p.id}] ${p.description} -> Delegate to ${p.assignedAgent}`)
    .join('\n')}

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

  // Load prompt from Hub
  const loadedPrompt = await loadPromptCached('supervisor')
  const promptMessages =
    (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessage = promptMessages.find(
    (m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system'
  )
  const systemTemplate =
    systemMessage?.prompt?.template || systemMessage?.template || SUPERVISOR_SYSTEM_PROMPT

  // Combine all system content into a single SystemMessage (required for Claude)
  const combinedSystemContent = [systemTemplate, contextXml, phaseContext].join('\n\n---\n\n')

  // Filter out any SystemMessages from conversation history (Claude doesn't allow them mid-conversation)
  const conversationMessages = state.messages.slice(-10).filter(m => m._getType() !== 'system')

  // Validation: LangChain/OpenAI strict rule:
  // 1. AIMessages with tool_calls must be followed by matching ToolMessages
  // 2. ToolMessages must have a preceding AIMessage with matching tool_calls

  // Step 1: Identify all tool_call IDs from AIMessages in the conversation
  const allToolCallIds = new Set<string>()
  conversationMessages.forEach(m => {
    if (m._getType() === 'ai' && (m as any).tool_calls?.length > 0) {
      const toolCalls = (m as any).tool_calls as any[]
      toolCalls.forEach(tc => allToolCallIds.add(tc.id))
    }
  })

  // Step 2: Identify all tool_call_ids from ToolMessages
  const allToolResponseIds = new Set(
    state.messages.filter(m => m._getType() === 'tool').map(m => (m as any).tool_call_id)
  )

  // Step 3: Clean the conversation slice - handle both directions
  // ALSO filter out any forced-* tool_calls from previous sessions
  const cleanMessages = conversationMessages
    // First, filter out orphan ToolMessages (no matching AIMessage with tool_calls)
    .filter(m => {
      if (m._getType() === 'tool') {
        const toolCallId = (m as any).tool_call_id
        if (!allToolCallIds.has(toolCallId)) {
          // Silently remove old orphan tool messages
          return false
        }
      }
      return true
    })
    // Then, clean AIMessages with dangling tool_calls
    .map(m => {
      if (m._getType() === 'ai' && (m as any).tool_calls?.length > 0) {
        const toolCalls = (m as any).tool_calls as any[]
        // Keep only calls that have a matching response AND are not old forced calls
        const validToolCalls = toolCalls.filter(tc => {
          // Filter out old forced tool_calls from previous sessions
          if (tc.id?.startsWith('forced-')) {
            return false
          }
          return allToolResponseIds.has(tc.id)
        })

        if (validToolCalls.length !== toolCalls.length) {
          const stripped = toolCalls.length - validToolCalls.length
          if (stripped > 0) {
            console.warn(`⚠️ Supervisor: Stripping ${stripped} dangling tool_calls.`)
          }

          // If NO calls are valid, remove tool_calls entirely
          if (validToolCalls.length === 0) {
            // Use a simple text message instead of tool_calls
            const newMsg = new AIMessage({
              content: m.content || 'Processing...',
              name: (m as any).name,
            })
            // CRITICAL: Force remove from additional_kwargs as well
            if (newMsg.additional_kwargs) {
              delete (newMsg.additional_kwargs as any).tool_calls
            }
            return newMsg
          }

          // Otherwise, keep only the valid ones
          const validMsg = new AIMessage({
            content: m.content,
            name: (m as any).name,
            tool_calls: validToolCalls,
          })
          // Sync additional_kwargs
          if (validMsg.additional_kwargs) {
            ;(validMsg.additional_kwargs as any).tool_calls = validToolCalls
          }
          return validMsg
        }
      }
      return m
    })

  const messages = [new SystemMessage(combinedSystemContent), ...cleanMessages]

  // If the last message in the slice isn't the user's command (due to system logs stuffing context),
  // forcefully append it to ensure the LLM sees the command.
  if (lastHumanMessage && !messages.includes(lastHumanMessage as any)) {
    if (lastMessage !== lastHumanMessage) {
      console.log('Supervisor: Re-injecting user command into context.')
      messages.push(
        new HumanMessage({ content: `(User's last command: "${lastHumanMessage.content}")` })
      )
    }
  }

  try {
    // FORCE DELEGATION: Check if user is requesting a Bible section update
    // LLMs sometimes ignore the routing instructions, so we enforce it here
    const userContent = lastHumanMessage?.content?.toString().toLowerCase() || ''
    // Comprehensive Bible section keywords - matches detectTargetSection in premise-architect
    const bibleSectionKeywords = [
      // Soundtracks
      'soundtrack',
      'music',
      'songs',
      'tracks',
      'playlist',
      'theme music',
      // World Rules
      'world rules',
      'laws',
      'rules of the world',
      'magic system',
      'laws of',
      // Factions
      'factions',
      'faction',
      'power groups',
      'organizations',
      'groups',
      // Inspirations
      'inspirations',
      'inspiration',
      'references',
      'influences',
      'books',
      'movies',
      'games',
      // World Description
      'world description',
      'atmosphere',
      'setting',
      'describe the world',
      // Key Characters
      'key characters',
      'protagonist',
      'antagonist',
      'main character',
      'characters',
      // Plot Twists
      'plot twists',
      'twists',
      'twist',
      'surprise',
      // Episode Roadmap
      'episode roadmap',
      'season arc',
      'episode breakdown',
      'roadmap',
      'season structure',
      // Generic Bible updates
      'world bible',
      'series bible',
      'bible',
    ]

    const requestsBibleUpdate = bibleSectionKeywords.some(kw => userContent.includes(kw))

    // Note: Removed forced delegation - caused tool_call errors
    // Now relying on tool_choice: 'required' and improved prompts

    // BIBLE LOCK ENFORCEMENT: Check if Bible is locked before allowing Bible updates
    // If locked, only admin can edit - block the request and guide user to beats/episodes
    if (requestsBibleUpdate && state.currentPhase === 'premise') {
      // Check if Bible is locked - we get this from state.seriesBible?.isLocked
      const isBibleLocked = state.seriesBible?.isLocked === true
      const userEmail = state.userEmail?.toLowerCase() || ''

      // Check if user is admin (central user)
      const centralUsers = (process.env.NEXT_PUBLIC_CENTRAL_USERS || 'jacek.sroga.itc@gmail.com')
        .split(',')
        .map(e => e.trim().toLowerCase())
      const isAdmin = centralUsers.includes(userEmail)

      if (isBibleLocked && !isAdmin) {
        console.log('Supervisor: Bible is LOCKED - blocking edit request')

        const lockedMessage = new AIMessage({
          content: `🔒 **World Bible is Locked**

The Series Bible has been locked by an administrator. While locked, you can:

- 📝 **Work on Episodes** - Create and edit episode premises
- 🎬 **Break Stories** - Create and manage story beats  
- 👥 **Develop Characters** - Work on character arcs within episodes
- 📖 **View Bible** - Read the world rules and lore (read-only)

💡 *To unlock the Bible, contact your admin or ask them to unlock it from the Bible panel.*

What would you like to work on instead?`,
          name: 'Showrunner',
        })

        return {
          messages: [lockedMessage],
          awaitingUserInput: true,
        }
      }

      console.log(
        'Supervisor: Detected Bible section request -> Forcing delegation to PremiseArchitect'
      )

      // Create a forced tool call response
      const delegationMessage = new AIMessage({
        content: 'Delegating to Premise Architect for World Bible update.',
        name: 'Showrunner',
        tool_calls: [
          {
            id: `forced-${Date.now()}`,
            name: 'delegate_to_premise_architect',
            args: {},
          },
        ],
      })

      return {
        messages: [delegationMessage],
        awaitingUserInput: false,
      }
    }

    // Invoke the model with tools bound
    const response = await supervisorModel.invoke(messages)

    // Interaction Fix: If NO tool calls, we assume the agent is talking to the user.
    // Therefore, we must pause for user input.
    let awaitingUserInput = false
    let phaseUpdate: Partial<WritersRoomState> = {}

    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log('Supervisor: No tool calls -> Pausing for user input.')
      awaitingUserInput = true

      // Format JSON content as readable message if the model returned JSON
      let content =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

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
      // Only trigger if we've called the SAME tool 3+ times without a user message in between
      const recentMessages = state.messages.slice(-10)
      const lastUserMsgIndex = recentMessages.findIndex(
        (m, i, arr) =>
          m._getType() === 'human' &&
          i === arr.length - 1 - [...arr].reverse().findIndex(x => x._getType() === 'human')
      )

      // Count how many times this tool was called AFTER the last user message
      let consecutiveSameToolCalls = 0
      for (let i = recentMessages.length - 1; i >= 0; i--) {
        const msg = recentMessages[i]
        if (msg._getType() === 'human') break // Stop at user message
        if (msg._getType() === 'ai' && (msg as AIMessage).tool_calls?.[0]?.name === toolName) {
          consecutiveSameToolCalls++
        }
      }

      // Only trigger circuit breaker if we've called the same tool 3+ times
      if (consecutiveSameToolCalls >= 3) {
        console.warn(
          `Supervisor: CIRCUIT BREAKER - Called ${toolName} ${consecutiveSameToolCalls} times consecutively`
        )
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
        const toolNames = response.tool_calls.map(tc => tc.name).join(', ')
        response.content = `Delegating to ${toolNames}...`
      }

      // Check for automatic phase transitions based on user commands
      const userCommand = lastHumanMessage?.content?.toString().toLowerCase() || ''

      // Auto-advance phase commands
      if (
        userCommand.includes('start breaking') ||
        userCommand.includes('move to breaking') ||
        userCommand.includes('break into beats') ||
        userCommand.includes('create beats') ||
        (userCommand.includes('beats') && state.currentPhase === 'premise')
      ) {
        const check = PHASE_TRANSITION_CONDITIONS['premise -> breaking']?.(state)
        if (check?.canAdvance && state.currentPhase === 'premise') {
          console.log('Auto-advancing to breaking phase based on user intent')
          phaseUpdate = { currentPhase: 'breaking' as Phase }
        }
      } else if (userCommand.includes('lock cards') || userCommand.includes('start writing')) {
        const check = PHASE_TRANSITION_CONDITIONS['breaking -> cardlock']?.(state)
        if (check?.canAdvance && state.currentPhase === 'breaking') {
          console.log('Auto-advancing to cardlock phase')
          phaseUpdate = { currentPhase: 'cardlock' as Phase }
        }
      } else if (
        userCommand.includes('go to writing') ||
        userCommand.includes('write the script')
      ) {
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
