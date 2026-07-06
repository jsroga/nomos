/**
 * Studio tool catalog — bundler-safe definitions mirroring production tool IDs.
 * Full DB/API execution runs in the Next.js app; Studio exposes tools for inspection and LLM routing.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const studioNote =
  'Registered for Mastra Studio. Full side effects (DB, Trigger jobs) run in the app runtime.'

function studioTool(
  id: string,
  description: string,
  inputSchema: z.ZodTypeAny = z.object({
    input: z.string().optional().describe('Freeform tool input for Studio testing'),
  }),
) {
  return createTool({
    id,
    description,
    inputSchema,
    execute: async inputData => ({
      studio: true,
      toolId: id,
      message: studioNote,
      input: inputData,
    }),
  })
}

function asToolsMap(tools: Array<{ id: string }>) {
  return Object.fromEntries(tools.map(tool => [tool.id, tool]))
}

const storytellerIds: Array<[string, string]> = [
  ['manage_beat', 'Direct beat manipulation: create, update, delete, move, duplicate, approve, lock, get, list.'],
  ['list_beats', 'List beats on the beat board with optional status filter.'],
  ['analyze_relationships', 'Analyze character relationship dynamics in the story.'],
  ['suggest_relationship', 'Suggest relationship changes between characters.'],
  ['check_continuity', 'Validate story consistency: world rules, character knowledge, setup/payoff, timeline.'],
  ['quick_consistency_check', 'Fast consistency check for a single statement.'],
  ['expand_scene', 'Expand a scene with visual detail and beat-by-beat action.'],
  ['condense_scene', 'Condense scene text while preserving meaning.'],
  ['improve_dialogue', 'Improve dialogue for voice, subtext, and character distinction.'],
  ['add_visual_hook', 'Add a strong visual hook to a beat or scene.'],
  ['shift_tone', 'Shift tone of a passage (darker, lighter, etc.).'],
  ['regenerate_text', 'Regenerate selected text with new creative direction.'],
  ['update_world_bible', 'Update locked/unlocked world bible sections.'],
  ['get_plot_phase', 'Get current hero journey plot phase for the episode.'],
  ['validate_consistency', 'Validate story consistency against bible and beats.'],
  ['update_story_phase', 'Advance or set the story phase on the beat board.'],
  ['research_topic', 'Research a topic for story grounding.'],
  ['fact_check', 'Fact-check a claim against references.'],
  ['lookup_reference', 'Look up a reference work or trope.'],
  ['search_knowledge_base', 'Semantic search over project knowledge base.'],
  ['store_knowledge', 'Store a knowledge snippet for RAG recall.'],
  ['search_character_history', 'Search character appearance and arc history.'],
  ['get_user_preferences', 'Load user creative preferences for this project.'],
  ['self_critique', 'LLM quality critique against GRRM/Gilligan standards.'],
  ['consult_psychologist', 'Delegate to the Psychologist council agent.'],
  ['consult_consequence_tracker', 'Delegate to the Consequence Tracker council agent.'],
  ['consult_devils_advocate', "Delegate to the Devil's Advocate council agent."],
  ['consult_gardener', 'Delegate to the Gardener council agent.'],
  ['consult_premise_architect', 'Delegate to the Premise Architect council agent.'],
  ['consult_consistency', 'Delegate to the Consistency judge agent.'],
  ['consult_creative_director', 'Delegate to a Creative Director judge persona.'],
  ['validate_references', 'Validate entity references in draft text.'],
  ['ask_character_questions', 'Ask clarifying questions before creating a character.'],
  ['create_character', 'Create a new character in the project.'],
  ['check_character_exists', 'Check if a character name already exists.'],
  ['create_episode', 'Create a new episode in the project.'],
  ['ask_continue_to_beats', 'Ask user whether to continue from premise to beats.'],
  ['start_beat_planning', 'Start beat planning for an episode.'],
  ['run_story_creation_workflow', 'Run the multi-step story creation workflow.'],
  ['analyze_psychology', 'Analyze character psychology for a beat or scene.'],
  ['simulate_reaction', 'Simulate how a character would react in a situation.'],
  ['assess_relationship', 'Assess relationship state between two characters.'],
]

export const storytellerStudioTools = asToolsMap(
  storytellerIds.map(([id, description]) => studioTool(id, description)),
)

export const gardenerStudioTools = asToolsMap(
  ['self_critique', 'improve_dialogue', 'add_visual_hook', 'condense_scene', 'regenerate_text'].map(
    id => storytellerStudioTools[id],
  ),
)

export const psychologistStudioTools = asToolsMap(
  ['analyze_psychology', 'simulate_reaction', 'assess_relationship', 'self_critique'].map(
    id => storytellerStudioTools[id],
  ),
)

export const councilStudioTools = asToolsMap([storytellerStudioTools.self_critique])

const gameDesignIds: Array<[string, string]> = [
  ['get_loops', 'Fetch game loops for the current project.'],
  ['get_loop_by_id', 'Fetch a single game loop by ID.'],
  ['get_market_analysis', 'Fetch stored market analysis for a loop.'],
  ['identify_core_loop', 'Identify the core gameplay loop from mechanics.'],
  ['analyze_mechanic_balance', 'Analyze effort/reward balance of mechanics.'],
  ['suggest_progression', 'Suggest progression systems for the design.'],
  ['validate_loop_structure', 'Validate loop graph structure for dead ends and grind.'],
  ['atomic_loom', 'Klei-style emergent systems design (Haute Game framework).'],
  ['memory_keeper', 'CDPR-style narrative memory design (Haute Game framework).'],
  ['grey_palette', 'Moral complexity palette design (Haute Game framework).'],
  ['strand_weaver', 'Interconnected consequence weaving (Haute Game framework).'],
  ['silent_teacher', 'Environmental storytelling design (Haute Game framework).'],
  ['mundane_poet', 'Meaningful mundane moments design (Haute Game framework).'],
]

export const gameDesignStudioTools = asToolsMap(
  gameDesignIds.map(([id, description]) => studioTool(id, description)),
)
