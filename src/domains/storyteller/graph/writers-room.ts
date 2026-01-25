import { StateGraph, END, START, Annotation } from '@langchain/langgraph'
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
import { WritersRoomState, Phase } from './state'
import * as agents from '../agents'
import { supervisorAgent } from '../agents/supervisor'
import { scriptEditorAgent } from '../agents/script-editor'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { RunnableLambda, RunnableConfig } from '@langchain/core/runnables'
import { supervisorTools } from '../tools/agent-tools'
import { scriptEditTools } from '../tools/script-tools'
import { plannerAgent } from '../agents/planner'
import { AIMessage, BaseMessage, ToolMessage } from '@langchain/core/messages'
import { reduceAgentActions } from './action-reducer'
import { AgentActionValidated } from '../schemas/agent-schemas'
import { AgentRole } from '../guardrails'
import { RunnableGuard } from '../guardrails/runnable-guard'
import {
  InputSafetyValidator,
  OutputSafetyValidator,
  ConsistencyValidator,
} from '../guardrails/validators'
import { validateURLsInText, extractURLsFromText } from '@/infrastructure/ai/tools/url-validator'

// ==================================================================
// HUMAN-IN-THE-LOOP TYPES
// ==================================================================

export interface HITLInterrupt {
  type: 'url_validation' | 'dangerous_action' | 'critical_decision' | 'user_confirmation'
  reason: string
  details: any
  agentName: string
  timestamp: number
  requiresApproval: boolean
  suggestions?: string[]
}

export interface HITLCheckpoint {
  state: Partial<WritersRoomState>
  interrupt?: HITLInterrupt
  canResume: boolean
}

// Actions that require human confirmation
const DANGEROUS_ACTIONS = ['DELETE_BEAT', 'LOCK_BEAT_BOARD', 'DELETE_EPISODE', 'RESET_CHARACTERS']

// Actions that should trigger URL validation
const URL_GENERATING_ACTIONS = [
  'UPDATE_SERIES_BIBLE',
  'UPDATE_INSPIRATIONS',
  'UPDATE_MOOD_SOUNDTRACK',
  'CREATE_BEAT',
]

// PostgreSQL checkpointer for thread persistence
const DATABASE_URL = process.env.DATABASE_URL

let checkpointer: PostgresSaver | undefined

async function getCheckpointer(): Promise<PostgresSaver> {
  if (!checkpointer && DATABASE_URL) {
    checkpointer = PostgresSaver.fromConnString(DATABASE_URL)
    await checkpointer.setup()
    console.log('PostgreSQL checkpointer initialized for LangSmith threads')
  }
  if (!checkpointer) {
    throw new Error('DATABASE_URL not set - cannot initialize PostgreSQL checkpointer')
  }
  return checkpointer
}

// ==================================================================
// TOOL NODE WITH STATE REDUCER
// ==================================================================

// We create a custom ToolNode because we need to capture the output of the agents (tools)
// and run it through our `action-reducer.ts` to update the graph state.
// The standard ToolNode just returns ToolMessages string content.

const toolNode = new ToolNode(supervisorTools)

// ToolNode for Writer's script editing tools
const writerToolNode = new ToolNode(scriptEditTools)

// ==================================================================
// WRITER -> SCRIPT EDITOR ROUTING (Evaluator-Optimizer Pattern)
// ==================================================================

// Route from Writer: Check if Writer made tool calls, otherwise go to Script Editor
function routeFromWriter(state: WritersRoomState): string {
  const messages = state.messages
  const lastMessage = messages[messages.length - 1] as AIMessage

  // If Writer made tool calls (for editing), route to writer_tools
  if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
    const toolName = lastMessage.tool_calls[0].name
    // Check if it's a script editing tool
    const scriptToolNames = [
      'expand_scene',
      'condense_scene',
      'improve_dialogue',
      'add_visual_hook',
      'shift_tone',
      'regenerate_text',
    ]
    if (scriptToolNames.includes(toolName)) {
      console.log(`Writer routing to writer_tools for: ${toolName}`)
      return 'writer_tools'
    }
  }

  // If Writer produced script content, route to Script Editor for evaluation
  if (state.script && state.script.trim().length > 0) {
    console.log('Writer routing to scriptEditor for evaluation')
    return 'scriptEditor'
  }

  // Default: go back to supervisor
  return 'supervisor'
}

// Route from Script Editor: Evaluator-Optimizer loop
function routeFromScriptEditor(state: WritersRoomState): string {
  const verdict = state.lastScriptVerdict
  const revisionCount = state.scriptRevisionCount || 0

  console.log(`Script Editor verdict: ${verdict}, revisions: ${revisionCount}`)

  // If PASS or max revisions reached, end the writing loop
  if (verdict === 'PASS') {
    console.log('Script approved - returning to supervisor')
    return 'supervisor'
  }

  // If REVISE and under limit, loop back to Writer
  if (verdict === 'REVISE' && revisionCount < 3) {
    console.log('Script needs revision - routing back to writer')
    return 'writer'
  }

  // Safety: max revisions reached
  console.log('Max revisions reached - returning to supervisor')
  return 'supervisor'
}

// Wrapper to intercept tool outputs and apply state updates
// Note: LangGraph's ToolNode executes tools. Our tools return "Delegating to..." strings.
// BUT, we want the *actual agent logic* to run.
//
// CORRECTION: In the Supervisor pattern, the tools usually *are* the agents.
// But our agents return `Partial<State>`.
// `ToolNode` expects tools to return strings/messages.
//
// OPTION B: We use `prebuilt.create_react_agent` style, where tools execute side effects.
//
// OPTION C (Chosen): We use a Router architecture.
// 1. Supervisor returns a tool_call.
// 2. `tools_condition` routes to a specific node for that tool (which is the agent).
// 3. That agent runs, returns state update + message.
// 4. Loop back to Supervisor.

// Helper to determine where to go next based on tool calls
function routeFromSupervisor(state: WritersRoomState) {
  const messages = state.messages
  const lastMessage = messages[messages.length - 1] as AIMessage

  // If the LLM decided to call a tool
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    const toolName = lastMessage.tool_calls[0].name
    console.log(`Supervisor routing to: ${toolName}`)

    // Map tool names to graph nodes
    const toolMap: Record<string, string> = {
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
      search_series_bible: 'utility_tools', // Route RAG to utility node
    }

    return toolMap[toolName] || END
  }

  // If no tool call, stop (await input or done)
  return END
}

// ==================================================================
// HUMAN-IN-THE-LOOP MIDDLEWARE
// ==================================================================

/**
 * Check if result contains URLs and validate them
 */
async function validateResultURLs(
  result: Partial<WritersRoomState>,
  agentName: string
): Promise<HITLInterrupt | null> {
  // Extract text content to check for URLs
  const messages = result.messages || []
  const lastMessage = messages[messages.length - 1]

  if (!lastMessage) return null

  const content =
    typeof lastMessage.content === 'string'
      ? lastMessage.content
      : JSON.stringify(lastMessage.content)

  const urls = extractURLsFromText(content)
  if (urls.length === 0) return null

  try {
    const validation = await validateURLsInText(content)

    if (validation.hasHallucinatedURLs) {
      const hallucinated = validation.urls.filter(u => u.isLikelyHallucinated)
      return {
        type: 'url_validation',
        reason: `Detected ${hallucinated.length} potentially hallucinated URL(s)`,
        details: {
          urls: hallucinated.map(u => ({
            url: u.url,
            reason: u.hallucinationReason,
            platform: u.platform,
          })),
        },
        agentName,
        timestamp: Date.now(),
        requiresApproval: true,
        suggestions: [
          'Remove the hallucinated URLs from the response',
          'Ask the user for the correct URL',
          'Generate content without referencing external URLs',
        ],
      }
    }
  } catch (error) {
    console.warn('[HITL] URL validation failed:', error)
  }

  return null
}

/**
 * Check if result contains dangerous actions
 */
function checkDangerousActions(
  result: Partial<WritersRoomState>,
  agentName: string
): HITLInterrupt | null {
  const messages = result.messages || []
  const lastMessage = messages[messages.length - 1]

  if (!lastMessage || !('actions' in lastMessage)) return null

  const actions = (lastMessage as any).actions || []
  const dangerous = actions.filter((a: any) => DANGEROUS_ACTIONS.includes(a.type))

  if (dangerous.length > 0) {
    return {
      type: 'dangerous_action',
      reason: `Agent attempting ${dangerous.length} potentially dangerous action(s)`,
      details: {
        actions: dangerous.map((a: any) => ({
          type: a.type,
          payload: a.payload,
        })),
      },
      agentName,
      timestamp: Date.now(),
      requiresApproval: true,
      suggestions: [
        'Review the actions before proceeding',
        'These actions may be irreversible',
        'Consider if this is the intended behavior',
      ],
    }
  }

  return null
}

/**
 * Human-in-the-Loop Middleware
 * Wraps agent execution with interrupt checkpoints
 */
class HITLMiddleware {
  private pendingInterrupt: HITLInterrupt | null = null
  private checkpoints: Map<string, HITLCheckpoint> = new Map()
  private checkpointTimestamps: Map<string, number> = new Map()
  private static readonly CHECKPOINT_TTL_MS = 30 * 60 * 1000 // 30 minutes

  constructor() {
    // Periodically clean up expired checkpoints to prevent memory leaks
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanupExpiredCheckpoints(), 5 * 60 * 1000) // Every 5 minutes
    }
  }

  /**
   * Clean up checkpoints older than TTL
   */
  private cleanupExpiredCheckpoints(): void {
    const now = Date.now()
    for (const [sessionId, timestamp] of this.checkpointTimestamps) {
      if (now - timestamp > HITLMiddleware.CHECKPOINT_TTL_MS) {
        this.checkpoints.delete(sessionId)
        this.checkpointTimestamps.delete(sessionId)
      }
    }
  }

  /**
   * Check if we should interrupt before agent execution
   */
  async shouldInterruptBefore(
    state: WritersRoomState,
    agentName: string
  ): Promise<HITLInterrupt | null> {
    // Check for explicit user interrupt request
    if (state.awaitingUserInput) {
      return null // Already waiting
    }

    // Check for any pending interrupts from previous runs
    if (this.pendingInterrupt) {
      const interrupt = this.pendingInterrupt
      this.pendingInterrupt = null
      return interrupt
    }

    return null
  }

  /**
   * Check if we should interrupt after agent execution
   */
  async shouldInterruptAfter(
    state: WritersRoomState,
    result: Partial<WritersRoomState>,
    agentName: string
  ): Promise<HITLInterrupt | null> {
    // Check for URL hallucinations in URL-generating actions
    const urlInterrupt = await validateResultURLs(result, agentName)
    if (urlInterrupt) return urlInterrupt

    // Check for dangerous actions
    const dangerousInterrupt = checkDangerousActions(result, agentName)
    if (dangerousInterrupt) return dangerousInterrupt

    return null
  }

  /**
   * Save checkpoint for potential rollback
   */
  saveCheckpoint(
    sessionId: string,
    state: Partial<WritersRoomState>,
    interrupt?: HITLInterrupt
  ): void {
    this.checkpoints.set(sessionId, {
      state,
      interrupt,
      canResume: true,
    })
    this.checkpointTimestamps.set(sessionId, Date.now())
  }

  /**
   * Get checkpoint for resume
   */
  getCheckpoint(sessionId: string): HITLCheckpoint | null {
    return this.checkpoints.get(sessionId) || null
  }

  /**
   * Clear checkpoint after successful resume
   */
  clearCheckpoint(sessionId: string): void {
    this.checkpoints.delete(sessionId)
    this.checkpointTimestamps.delete(sessionId)
  }

  /**
   * Set pending interrupt for next check
   */
  setPendingInterrupt(interrupt: HITLInterrupt): void {
    this.pendingInterrupt = interrupt
  }
}

// Global HITL middleware instance
const hitlMiddleware = new HITLMiddleware()

export { hitlMiddleware, HITLMiddleware }

// ==================================================================
// AGENT WRAPPER (REDUX) - REPLACED BY RUNNABLE GUARD
// ==================================================================

// Helper to create a guarded agent with HITL support
const createGuardedAgent = (agentFn: any, role: AgentRole) => {
  const guard = new RunnableGuard({
    agent: RunnableLambda.from(agentFn),
    agentRole: role,
    inputValidators: [new InputSafetyValidator()],
    outputValidators: [new OutputSafetyValidator(role), new ConsistencyValidator(role)],
    maxRetries: 3,
  })

  return RunnableLambda.from(async (state: WritersRoomState, config) => {
    const lastMsg = state.messages[state.messages.length - 1]
    let resultToolMessages: ToolMessage[] = []
    let inputState = state

    // 0. HITL: Check for pre-execution interrupts
    const preInterrupt = await hitlMiddleware.shouldInterruptBefore(state, role)
    if (preInterrupt) {
      console.log(`[HITL] Pre-interrupt for ${role}: ${preInterrupt.reason}`)
      // Save checkpoint and pause
      hitlMiddleware.saveCheckpoint(state.projectId, state, preInterrupt)
      return {
        awaitingUserInput: true,
        messages: [
          new AIMessage({
            content: `⚠️ ${preInterrupt.reason}\n\nPlease review before continuing.`,
            name: role,
          }),
        ],
      }
    }

    // 1. Check for dangling tool calls from Supervisor
    if (lastMsg && 'tool_calls' in lastMsg && (lastMsg as any).tool_calls?.length > 0) {
      const toolCalls = (lastMsg as any).tool_calls as any[]
      const toolMessages = toolCalls.map(
        tc =>
          new ToolMessage({
            tool_call_id: tc.id,
            content: `Agent ${role} delegated task: ${tc.name}`,
            name: tc.name,
          })
      )

      // Inject ToolMessages into state so the Agent (LLM) sees a valid history
      inputState = {
        ...state,
        messages: [...state.messages, ...toolMessages],
      }

      // Keep track of them to return to the graph
      resultToolMessages = toolMessages
    }

    // 2. Invoke Guard (which invokes Agent)
    const result = await guard.invoke(inputState, config)

    // 3. HITL: Check for post-execution interrupts
    const postInterrupt = await hitlMiddleware.shouldInterruptAfter(state, result, role)
    if (postInterrupt) {
      console.log(`[HITL] Post-interrupt for ${role}: ${postInterrupt.reason}`)

      // URL validation issues should be handled internally, not shown to user
      if (postInterrupt.type === 'url_validation') {
        console.log('[HITL] URL validation issue detected - handling internally')
        // Continue with the result but strip invalid URLs from actions
        // The content is still valid, just the URLs might be hallucinated
        // User will see the soundtracks but URLs may not work (acceptable)
        return {
          ...result,
          messages: [...resultToolMessages, ...(result.messages || [])].filter(
            Boolean
          ) as BaseMessage[],
        }
      }

      // Save checkpoint with the result that needs review
      hitlMiddleware.saveCheckpoint(state.projectId, result, postInterrupt)

      // Return modified result that flags the issue (only for non-URL issues)
      const warningMessage = new AIMessage({
        content:
          `⚠️ **Review Required**: ${postInterrupt.reason}\n\n` +
          `${postInterrupt.suggestions?.map(s => `- ${s}`).join('\n') || ''}`,
        name: role,
      })

      // Depending on severity, either block or warn
      if (postInterrupt.requiresApproval) {
        return {
          awaitingUserInput: true,
          messages: [...resultToolMessages, warningMessage].filter(Boolean) as BaseMessage[],
        }
      }

      // Warning only - continue with result
      return {
        ...result,
        messages: [...resultToolMessages, ...(result.messages || []), warningMessage].filter(
          Boolean
        ) as BaseMessage[],
      }
    }

    // 4. Safety: Strip tool_calls from specialist agents (only supervisor should have them in V1)
    const cleanedMessages = (result.messages || []).map(msg => {
      // If this is a specialist agent (not supervisor), remove tool_calls
      if (role !== 'supervisor' && msg.constructor.name === 'AIMessage') {
        const aiMsg = msg as AIMessage
        if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
          console.warn(
            `[Agent Wrapper] Stripping tool_calls from ${role} (only supervisor should use tools in V1)`
          )
          // Create new message without tool_calls
          return new AIMessage({
            content: aiMsg.content,
            name: aiMsg.name,
            additional_kwargs: aiMsg.additional_kwargs,
          })
        }
      }
      return msg
    })

    // 5. Ensure tool messages are returned to the graph state
    if (resultToolMessages.length > 0) {
      return {
        ...result,
        messages: [...resultToolMessages, ...cleanedMessages],
      }
    }

    return {
      ...result,
      messages: cleanedMessages,
    }
  })
}

// ==================================================================
// GRAPH DEFINITION
// ==================================================================

const workflow = new StateGraph<WritersRoomState>({
  channels: {
    // ... same channels as before ...
    projectId: { reducer: x => x ?? '' },
    episodeId: { reducer: (x, y) => y ?? x },
    currentPhase: { reducer: (x, y) => y ?? x ?? 'premise' },
    phaseIterations: { reducer: (x, y) => y ?? x ?? 0 },
    maxIterationsPerPhase: { reducer: x => x ?? 15 },
    seriesBible: { reducer: (x, y) => y ?? x ?? {} },
    characters: { reducer: (x, y) => y ?? x ?? [] },
    beatBoard: { reducer: (x, y) => y ?? x ?? [] },
    currentBeat: { reducer: (x, y) => y ?? x },
    unresolvedSetups: { reducer: (x, y) => y ?? x ?? [] },
    rejectedBeats: { reducer: (x, y) => y ?? x ?? [] },
    script: { reducer: (x, y) => y ?? x },
    scriptVersion: { reducer: (x, y) => y ?? x ?? 0 },
    messages: { reducer: (x, y) => (x ?? []).concat(y ?? []) },
    awaitingUserInput: { reducer: (x, y) => y ?? x ?? false },
    lastAction: { reducer: (x, y) => y ?? x },
    shouldTerminate: { reducer: (x, y) => y ?? x ?? false },
    beatChallengeCount: { reducer: (x, y) => y ?? x ?? 0 },
    lastDevilVerdict: { reducer: (x, y) => y ?? x },
    reflectionNotes: { reducer: (x, y) => y ?? x ?? [] },
    minConfidenceThreshold: { reducer: x => x ?? 0.7 },
    lastAgentConfidence: { reducer: (x, y) => y ?? x },
    // Script evaluation channels (Evaluator-Optimizer loop)
    lastScriptVerdict: { reducer: (x, y) => y ?? x },
    scriptRevisionCount: { reducer: (x, y) => y ?? x ?? 0 },
    scriptFeedback: { reducer: (x, y) => y ?? x ?? [] },
  },
})

// Nodes - Each agent wrapped with role-specific guardrails
workflow.addNode('supervisor', supervisorAgent) // Supervisor handles its own tools
workflow.addNode('planner', createGuardedAgent(plannerAgent, 'planner'))
workflow.addNode('plotArchitect', createGuardedAgent(agents.plotArchitectAgent, 'plotArchitect'))
workflow.addNode(
  'characterPsychology',
  createGuardedAgent(agents.characterPsychologyAgent, 'characterPsychology')
)
workflow.addNode(
  'consequenceTracker',
  createGuardedAgent(agents.consequenceTrackerAgent, 'consequenceTracker')
)
workflow.addNode('devilsAdvocate', createGuardedAgent(agents.devilsAdvocateAgent, 'devilsAdvocate'))
workflow.addNode('writer', createGuardedAgent(agents.writerAgent, 'writer'))
workflow.addNode(
  'premiseArchitect',
  createGuardedAgent(agents.premiseArchitectAgent, 'premiseArchitect')
)
workflow.addNode(
  'episodePremiseArchitect',
  createGuardedAgent(agents.episodePremiseArchitectAgent, 'episodePremiseArchitect')
)
workflow.addNode('magicAgent', createGuardedAgent(agents.magicAgent, 'magicAgent'))

// Script Editor node (Evaluator-Optimizer pattern)
workflow.addNode('scriptEditor', createGuardedAgent(scriptEditorAgent, 'scriptEditor'))

// Entry
workflow.setEntryPoint('supervisor')

// Utility tools node (for RAG, etc.)
workflow.addNode('utility_tools', toolNode)

// Writer tools node (for script editing)
workflow.addNode('writer_tools', writerToolNode)

// Supervisor Routing (The "Brain")
workflow.addConditionalEdges('supervisor', routeFromSupervisor, {
  plotArchitect: 'plotArchitect',
  characterPsychology: 'characterPsychology',
  consequenceTracker: 'consequenceTracker',
  devilsAdvocate: 'devilsAdvocate',
  writer: 'writer',
  premiseArchitect: 'premiseArchitect',
  episodePremiseArchitect: 'episodePremiseArchitect',
  magicAgent: 'magicAgent',
  scriptEditor: 'scriptEditor',
  planner: 'planner',
  utility_tools: 'utility_tools',
  [END]: END,
})

// Workers return to Supervisor
workflow.addEdge('planner', 'supervisor')
workflow.addEdge('plotArchitect', 'supervisor')
workflow.addEdge('characterPsychology', 'supervisor')
workflow.addEdge('consequenceTracker', 'supervisor')
workflow.addEdge('devilsAdvocate', 'supervisor')
workflow.addEdge('premiseArchitect', 'supervisor')
workflow.addEdge('episodePremiseArchitect', 'supervisor')
workflow.addEdge('magicAgent', 'supervisor')
workflow.addEdge('utility_tools', 'supervisor')

// ==================================================================
// EVALUATOR-OPTIMIZER LOOP FOR SCRIPT WRITING
// ==================================================================

// Writer routes to either tool execution or Script Editor
workflow.addConditionalEdges('writer', routeFromWriter, {
  writer_tools: 'writer_tools',
  scriptEditor: 'scriptEditor',
  supervisor: 'supervisor',
})

// Writer tools return to Writer (for further processing)
workflow.addEdge('writer_tools', 'writer')

// Script Editor routes back to Writer (revision) or Supervisor (approved)
workflow.addConditionalEdges('scriptEditor', routeFromScriptEditor, {
  writer: 'writer',
  supervisor: 'supervisor',
})

// Compilation (sync in LangGraph 1.x)
const baseGraph = workflow.compile({})
let compiledGraphWithCheckpointer: ReturnType<typeof workflow.compile> | null = null

export async function getWritersRoomGraph() {
  if (!compiledGraphWithCheckpointer && DATABASE_URL) {
    try {
      const pgCheckpointer = await getCheckpointer()
      compiledGraphWithCheckpointer = workflow.compile({
        checkpointer: pgCheckpointer,
      })
      console.log('Writers room graph compiled with PostgreSQL checkpointer')
    } catch (error) {
      console.warn('Failed to initialize PostgreSQL checkpointer, using base graph:', error)
      return baseGraph
    }
  }
  return compiledGraphWithCheckpointer || baseGraph
}

/**
 * Feature flag for V2 (Handoffs pattern)
 * Set USE_HANDOFFS_PATTERN=true to enable new architecture
 */
const USE_HANDOFFS_PATTERN = process.env.USE_HANDOFFS_PATTERN === 'true'

/**
 * Get the appropriate graph based on feature flag
 */
export async function getActiveWritersRoomGraph() {
  if (USE_HANDOFFS_PATTERN) {
    console.log('🚀 [Graph] Using V2 (Handoffs + Skills pattern)')
    const { getWritersRoomGraphV2 } = await import('./writers-room-v2')
    return getWritersRoomGraphV2()
  }

  console.log('📊 [Graph] Using V1 (Supervisor pattern)')
  return getWritersRoomGraph()
}

export const writersRoomGraph = baseGraph
export const GRAPH_NAME = 'writers-room'
