import { StateGraph, END } from '@langchain/langgraph'
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
import { WritersRoomState, Phase } from './state'
import * as agents from '../agents'
import { supervisorAgent } from '../agents/supervisor'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { supervisorTools } from '../tools/agent-tools'
import { AIMessage, BaseMessage } from '@langchain/core/messages'
import { reduceAgentActions } from './action-reducer'
import { AgentActionValidated } from '../schemas/agent-schemas'

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
      'delegate_to_plot_architect': 'plotArchitect',
      'delegate_to_character_psychology': 'characterPsychology',
      'delegate_to_consequence_tracker': 'consequenceTracker',
      'delegate_to_devils_advocate': 'devilsAdvocate',
      'delegate_to_writer': 'writer',
      'delegate_to_premise_architect': 'premiseArchitect',
      'delegate_to_episode_premise_architect': 'episodePremiseArchitect',
      'search_series_bible': 'utility_tools' // Route RAG to utility node
    }

    return toolMap[toolName] || END
  }

  // If no tool call, stop (await input or done)
  return END
}

// ==================================================================
// AGENT WRAPPER (REDUX)
// ==================================================================

import { ToolMessage } from '@langchain/core/messages';

const wrapAgentWithReducer = (agentFn: Function) => {
  return async (state: WritersRoomState): Promise<Partial<WritersRoomState>> => {
    // 0. Pre-Flight: Detect pending tool calls from Supervisor
    // If the last message is an AIMessage with tool_calls, we must generate a corresponding ToolMessage
    // to satisfy OpenAI's validation rules before the Agent generates new content.
    const messages = state.messages || [];
    const lastMessage = messages[messages.length - 1];
    const syntheticToolMessages: ToolMessage[] = [];

    if (lastMessage && 'tool_calls' in lastMessage && (lastMessage.tool_calls as any[]).length > 0) {
      // We assume the current node corresponds to the tool being called.
      // We construct a ToolMessage that says "Agent executed successfully".
      const toolCalls = (lastMessage.tool_calls as any[]);
      for (const toolCall of toolCalls) {
        syntheticToolMessages.push(new ToolMessage({
          tool_call_id: toolCall.id,
          content: `Agent ${agentFn.name} executed.`,
          name: toolCall.name
        }));
      }
    }

    // 1. Run the original agent
    // Note: We don't pass the synthetic messages to the agentFn yet, 
    // because the agentFn uses the state as is. 
    // However, if the agentFn uses an LLM, it might crash if it sees the dangling tool call?
    // YES. If the agentFn calls model.invoke(state.messages), it will crash.
    // So we MUST append the tool message to the state passed to the agent.

    const stateWithToolResponse = {
      ...state,
      messages: [...messages, ...syntheticToolMessages]
    };

    const agentResult = await agentFn(stateWithToolResponse);

    // 2. Extract actions from the result message, if any
    const resultMessages = agentResult.messages || [];
    const lastResultMsg = resultMessages[resultMessages.length - 1];
    const actions: AgentActionValidated[] = (lastResultMsg as any)?.actions || [];

    // 3. If we have actions, run them through the reducer
    let reducedUpdates = {};
    if (actions.length > 0) {
      console.log(`Processing ${actions.length} actions from ${agentFn.name}...`);
      reducedUpdates = reduceAgentActions(state, actions);
    }

    // 4. Merge agent result with reduced state updates
    // We must ensure the synthetic ToolMessages are included in the returned messages
    // so they are persisted to the graph history.
    return {
      ...agentResult,
      messages: [...syntheticToolMessages, ...resultMessages],
      ...reducedUpdates
    };
  };
};

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
  },
})

// Nodes
workflow.addNode('supervisor', supervisorAgent)
workflow.addNode('plotArchitect', wrapAgentWithReducer(agents.plotArchitectAgent))
workflow.addNode('characterPsychology', wrapAgentWithReducer(agents.characterPsychologyAgent))
workflow.addNode('consequenceTracker', wrapAgentWithReducer(agents.consequenceTrackerAgent))
workflow.addNode('devilsAdvocate', wrapAgentWithReducer(agents.devilsAdvocateAgent))
workflow.addNode('writer', wrapAgentWithReducer(agents.writerAgent))
workflow.addNode('premiseArchitect', wrapAgentWithReducer(agents.premiseArchitectAgent))
workflow.addNode('episodePremiseArchitect', wrapAgentWithReducer(agents.episodePremiseArchitectAgent))

// Entry
workflow.setEntryPoint('supervisor')

// Utility tools node (for RAG, etc.)
workflow.addNode('utility_tools', toolNode)

// Supervisor Routing (The "Brain")
workflow.addConditionalEdges('supervisor', routeFromSupervisor, {
  plotArchitect: 'plotArchitect',
  characterPsychology: 'characterPsychology',
  consequenceTracker: 'consequenceTracker',
  devilsAdvocate: 'devilsAdvocate',
  writer: 'writer',
  premiseArchitect: 'premiseArchitect',
  episodePremiseArchitect: 'episodePremiseArchitect',
  utility_tools: 'utility_tools',
  [END]: END
})

// Workers return to Supervisor
workflow.addEdge('plotArchitect', 'supervisor')
workflow.addEdge('characterPsychology', 'supervisor')
workflow.addEdge('consequenceTracker', 'supervisor')
workflow.addEdge('devilsAdvocate', 'supervisor')
workflow.addEdge('writer', 'supervisor')
workflow.addEdge('premiseArchitect', 'supervisor')
workflow.addEdge('episodePremiseArchitect', 'supervisor')
workflow.addEdge('utility_tools', 'supervisor')

// Compilation
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

export const writersRoomGraph = baseGraph
export const GRAPH_NAME = 'writers-room'
