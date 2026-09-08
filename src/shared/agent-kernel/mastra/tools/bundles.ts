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
  ['manage_character', 'Create, update, delete, or get a character.'],
  ['list_characters', 'List characters in a project, optionally filtered by role.'],
  ['manage_episode', 'Create, update, delete, or get an episode.'],
  ['list_episodes', 'List episodes in a project, ordered by sequence.'],
  ['update_world_bible', 'Update locked/unlocked world bible sections.'],
  ['read_world_bible', 'Read world bible sections for the open project.'],
  ['check_continuity', 'Validate story consistency: world rules, character knowledge, setup/payoff, timeline.'],
  ['check_section_alignment', 'Check one generated section against related canon.'],
  ['search_manuscript', 'Search manuscript, beats, and setups. Literal first, embedding after a miss.'],
  ['promote_rule', 'Promote or revoke a versioned project world rule. Mutating.'],
  ['propose_character_fields', 'Fill missing fields on the unsaved character create/edit form.'],
  ['run_beat_draft_workflow', 'Draft a story beat through the GRRM quality pipeline.'],
]

export const storytellerStudioTools = asToolsMap(
  storytellerIds.map(([id, description]) => studioTool(id, description)),
)

const gameDesignIds: Array<[string, string]> = [
  ['get_game_loops', 'Fetch game loops for the current project.'],
  ['get_game_loop_by_id', 'Fetch a single game loop by ID.'],
  ['get_market_analysis', 'Fetch stored market analysis for a loop.'],
  ['identify_core_loop', 'Identify the core gameplay loop from mechanics.'],
  ['analyze_mechanic_balance', 'Analyze effort/reward balance of mechanics.'],
  ['suggest_progression', 'Suggest progression systems for the design.'],
  ['validate_loop_structure', 'Validate loop graph structure for dead ends and grind.'],
  ['design_atomic_systems', 'Klei-style emergent systems design (Haute Game framework).'],
  ['design_world_memory', 'CDPR-style narrative memory design (Haute Game framework).'],
  ['design_moral_choices', 'Moral complexity palette design (Haute Game framework).'],
  ['design_strand_connections', 'Interconnected consequence weaving (Haute Game framework).'],
  ['design_implicit_tutorial', 'Environmental storytelling design (Haute Game framework).'],
  ['design_meaningful_mundane', 'Meaningful mundane moments design (Haute Game framework).'],
]

export const gameDesignStudioTools = asToolsMap(
  gameDesignIds.map(([id, description]) => studioTool(id, description)),
)
