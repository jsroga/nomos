/**
 * Studio MCP catalog — bundler-safe server mirroring production `src/mcp/server.ts`.
 * Full DB/API execution runs via stdio (`npm run mcp:start`) or HTTP (`/api/mcp`).
 */

import { MCPServer } from '@mastra/mcp'
import type { MCPServerResources } from '@mastra/mcp/server'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const studioNote =
  'Registered for Mastra Studio. Full side effects run in the app MCP runtime (stdio or /api/mcp).'

function studioMcpTool(id: string, description: string) {
  return createTool({
    id,
    description,
    inputSchema: z.object({
      input: z.string().optional().describe('Freeform tool input for Studio testing'),
    }),
    execute: async inputData => ({
      studio: true,
      toolId: id,
      message: studioNote,
      input: inputData,
    }),
  })
}

const toolCatalog: Array<[string, string]> = [
  // entities
  ['list_entities', 'List game entities for a project with optional filters.'],
  ['get_entity', 'Get a single game entity by ID.'],
  ['create_entity', 'Create a new game entity.'],
  ['update_entity', 'Update an existing game entity.'],
  ['delete_entity', 'Delete a game entity.'],
  // storyteller
  ['list_characters', 'List all characters in a project.'],
  ['get_character', 'Get a single character by ID.'],
  ['create_character', 'Create a new character in a project.'],
  ['update_character', 'Update an existing character.'],
  ['delete_character', 'Delete a character.'],
  ['list_episodes', 'List episodes for a project.'],
  ['list_beats', 'List beats for an episode.'],
  ['get_series_bible', 'Get the series bible for a project.'],
  ['storyteller_chat', 'Send a message to the storyteller agent.'],
  // generation
  ['generate_tile', 'Generate a world tile image.'],
  ['upscale_tile', 'Upscale a generated tile.'],
  ['generate_3d_model', 'Generate a 3D model from an image or prompt.'],
  ['remesh_3d_model', 'Remesh an existing 3D model.'],
  ['generate_portrait', 'Generate a character portrait.'],
  // trigger
  ['get_run_status', 'Get status of a Trigger.dev run.'],
  ['cancel_run', 'Cancel a Trigger.dev run.'],
  ['wait_for_run', 'Wait for a Trigger.dev run to complete.'],
]

const studioTools = Object.fromEntries(
  toolCatalog.map(([id, description]) => [id, studioMcpTool(id, description)]),
)

const studioResources: MCPServerResources = {
  listResources: async () => [
    {
      uri: 'wbk://projects',
      name: 'Projects',
      description: 'List all projects accessible to the API key',
      mimeType: 'application/json',
    },
    {
      uri: 'wbk://project/{projectId}/entities',
      name: 'Project Entities',
      description: 'List entities for a project',
      mimeType: 'application/json',
    },
    {
      uri: 'wbk://project/{projectId}/characters',
      name: 'Project Characters',
      description: 'List characters for a project',
      mimeType: 'application/json',
    },
    {
      uri: 'wbk://project/{projectId}/episodes',
      name: 'Project Episodes',
      description: 'List episodes for a project',
      mimeType: 'application/json',
    },
    {
      uri: 'wbk://project/{projectId}/series-bible',
      name: 'Series Bible',
      description: 'Get the series bible for a project',
      mimeType: 'application/json',
    },
    {
      uri: 'wbk://episode/{episodeId}/beats',
      name: 'Episode Beats',
      description: 'List beats for an episode',
      mimeType: 'application/json',
    },
  ],
  getResourceContent: async ({ uri }) => ({
    text: JSON.stringify(
      {
        studio: true,
        uri,
        message: studioNote,
      },
      null,
      2,
    ),
  }),
}

export const worldBuildingKitMcpServer = new MCPServer({
  id: 'world-building-kit',
  name: 'World Building Kit',
  version: '1.0.0',
  description:
    'MCP server for World Building Kit — entities, storyteller, generation, and Trigger.dev runs.',
  instructions:
    'Use MCP_API_KEY for auth. Studio exposes tool/resource metadata; run `npm run mcp:start` or POST /api/mcp for live execution.',
  tools: studioTools,
  resources: studioResources,
  remotes: [
    {
      transport_type: 'streamable',
      url: 'http://localhost:3000/api/mcp',
    },
  ],
})

export const studioMcpServers = {
  'world-building-kit': worldBuildingKitMcpServer,
}
