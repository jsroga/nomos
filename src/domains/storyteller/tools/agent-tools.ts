import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { plotArchitectAgent } from '../agents/plot-architect'
import { characterPsychologyAgent } from '../agents/character-psychology'
import { consequenceTrackerAgent } from '../agents/consequence-tracker'
import { devilsAdvocateAgent } from '../agents/devils-advocate'
import { writerAgent } from '../agents/writer'
import { premiseArchitectAgent } from '../agents/premise-architect'
import { magicAgent } from '../agents/magic-agent'
import { scriptEditorAgent } from '../agents/script-editor'
import { WritersRoomState } from '../graph/state'
import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { createRagTool } from './rag-tools'
import { plannerAgent } from '../agents/planner'
import { episodePremiseArchitectAgent } from '../agents/episode-premise-architect'

// New Tool Imports
import { createBeatManagementTool, createBeatListTool } from './beat-management-tools'
import { createContinuityCheckerTool, createQuickConsistencyTool } from './continuity-tools'
import {
  createRelationshipAnalyzerTool,
  createRelationshipSuggestionTool,
} from './character-relationship-tools'
import { createResearchTool, createFactCheckTool } from './research-tools'
import { createVisualConceptTool, createBeatToStoryboardTool } from './visual-concept-tools'

// Define schemas for tool inputs
const AgentInputSchema = z.object({
  instruction: z.string().describe('The specific instruction or task for the agent to perform.'),
})

// Helper to wrap an agent as a tool
function createAgentTool(
  name: string,
  description: string,
  agentFn: (state: WritersRoomState) => Promise<Partial<WritersRoomState>>
) {
  return new DynamicStructuredTool({
    name,
    description,
    schema: AgentInputSchema,
    func: async ({ instruction }) => {
      // This tool logic is tricky because tools typically return strings,
      // but our agents return state updates.
      // In the Supervisor pattern, the tool execution happens in a separate node (ToolNode),
      // which can handle the state update merging.
      // However, `func` here is for the Tool instance itself.

      // For the "Supervisor as Router" pattern, the Supervisor LLM emits a tool call.
      // The graph then routes to a node that *executes* that tool.
      // If we use LangGraph's prebuilt `ToolNode`, it expects the tool to return a string/Message.

      // STRATEGY:
      // We will NOT put the full agent logic inside `func`.
      // Instead, this tool definition serves primarily as a SCHEMA for the LLM to bind to.
      // The actual execution will happen in the graph nodes routed by the tool name.
      // But to satisfy the interface, we return the instruction, which the node can use.

      return `Delegating to ${name} with instruction: ${instruction}`
    },
  })
}

// Export tools for the Supervisor to bind
export const plotArchitectTool = createAgentTool(
  'delegate_to_plot_architect',
  'Use this agent to create, edit, split, merge, or refine story beats. They are the primary creative engine for plot structure.',
  plotArchitectAgent
)

export const characterPsychologyTool = createAgentTool(
  'delegate_to_character_psychology',
  'Use this agent to check character consistency, emotional logic, and internal motivations. Call them to review beats or suggest character reactions.',
  characterPsychologyAgent
)

export const consequenceTrackerTool = createAgentTool(
  'delegate_to_consequence_tracker',
  'Use this agent to track continuity, setups/payoffs, and world consistency. Call them to ensure the story logic holds up.',
  consequenceTrackerAgent
)

export const devilsAdvocateTool = createAgentTool(
  'delegate_to_devils_advocate',
  'Use this agent to critique beats, find plot holes, and suggest "spicier" alternatives. Call them to stress-test ideas.',
  devilsAdvocateAgent
)

export const writerAgentTool = createAgentTool(
  'delegate_to_writer',
  'Use this agent to write actual script content (scenes, dialogue, action) based on beats. Call them when moving from outline to screenplay.',
  writerAgent
)

export const premiseArchitectTool = createAgentTool(
  'delegate_to_premise_architect',
  'Use this agent to define the Series Bible, World Rules, Factions, and initial Premise. Call them at the start of a project or to update world lore.',
  premiseArchitectAgent
)

export const episodePremiseArchitectTool = createAgentTool(
  'delegate_to_episode_premise_architect',
  'Use this agent to generate loglines, premises, and hooks for A SINGLE specific episode. Use this for requests like "generate premise for this episode" or "create a random episode".',
  episodePremiseArchitectAgent
)

export const magicAgentTool = createAgentTool(
  'delegate_to_magic_agent',
  'Use this agent to inject random absurd suggestions, unexpected events, and chaotic spice into the story. Call them when things feel too predictable or need comedic relief.',
  magicAgent
)

export const scriptEditorTool = createAgentTool(
  'delegate_to_script_editor',
  'Use this agent to review and critique script quality. They evaluate dialogue, visual hooks, pacing, format, and character voice. Returns PASS (approved) or REVISE (needs work) with detailed feedback.',
  scriptEditorAgent
)

export const plannerTool = createAgentTool(
  'delegate_to_planner',
  'The Master Architect. Call this tool to create, update, or decompose a complex plan. REQUIRED for any multi-step request (e.g. "Create a world and characters").',
  plannerAgent
)

// RAG Tool placeholder - needs state injection, so we might need a factory or bind it later
// For static export, we can't inject state yet.
// Instead, we'll define a static "schema-only" tool here if needed, OR rely on the supervisor to bind it dynamically.
// But `bindTools` needs actual tools.
// Workaround: Export a factory function for the full toolset.

/**
 * Get all supervisor tools with state-dependent tools injected.
 *
 * Tools are organized into categories:
 * 1. Agent Delegation Tools - Route to specialized agents
 * 2. Direct Action Tools - Perform immediate operations
 * 3. Analysis Tools - Read-only analysis and checks
 * 4. Research Tools - External knowledge gathering
 */
export const getSupervisorTools = (state: WritersRoomState) => [
  // === AGENT DELEGATION TOOLS ===
  // Route complex tasks to specialized agents
  plotArchitectTool,
  characterPsychologyTool,
  consequenceTrackerTool,
  devilsAdvocateTool,
  writerAgentTool,
  premiseArchitectTool,
  episodePremiseArchitectTool,
  magicAgentTool,
  scriptEditorTool,
  plannerTool,

  // === DIRECT ACTION TOOLS (NEW) ===
  // Perform immediate CRUD operations without full agent deliberation
  createBeatManagementTool(state), // Create/update/delete/move beats
  createBeatListTool(state), // Quick beat board overview

  // === ANALYSIS TOOLS (NEW) ===
  // Read-only analysis and consistency checks
  createContinuityCheckerTool(state), // Check plot holes, world rules, setups/payoffs
  createQuickConsistencyTool(state), // Fast single-statement consistency check
  createRelationshipAnalyzerTool(state), // Character relationship matrix
  createRelationshipSuggestionTool(state), // Suggest relationship dynamics

  // === RESEARCH TOOLS (NEW) ===
  // External knowledge and reference material
  createRagTool(state), // Search project knowledge base
  createResearchTool(state), // Web research for authentic storytelling
  createFactCheckTool(state), // Quick fact verification

  // === VISUAL TOOLS (NEW) ===
  // Visual concept generation
  createVisualConceptTool(state), // Generate visual concepts for moments
  createBeatToStoryboardTool(state), // Convert beats to storyboard panels
]

/**
 * Get only the new direct-action and analysis tools.
 * Useful for agents that need utilities but not delegation capabilities.
 */
export const getUtilityTools = (state: WritersRoomState) => [
  createBeatManagementTool(state),
  createBeatListTool(state),
  createContinuityCheckerTool(state),
  createQuickConsistencyTool(state),
  createRelationshipAnalyzerTool(state),
  createRagTool(state),
]

/**
 * Get research-focused tools only.
 */
export const getResearchTools = (state: WritersRoomState) => [
  createResearchTool(state),
  createFactCheckTool(state),
  createRagTool(state),
]

/**
 * Get visual/storyboard tools only.
 */
export const getVisualTools = (state: WritersRoomState) => [
  createVisualConceptTool(state),
  createBeatToStoryboardTool(state),
]

// Legacy export for backward compat (without state-dependent tools)
export const supervisorTools = [
  plotArchitectTool,
  characterPsychologyTool,
  consequenceTrackerTool,
  devilsAdvocateTool,
  writerAgentTool,
  premiseArchitectTool,
  episodePremiseArchitectTool,
  magicAgentTool,
  scriptEditorTool,
  plannerTool,
  // State-dependent tools not included here - use getSupervisorTools(state) instead
]
