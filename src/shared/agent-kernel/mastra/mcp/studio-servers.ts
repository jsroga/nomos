/**
 * Studio MCP catalog — bundler-safe server mirroring production `src/mcp/server.ts`.
 * Full DB/API execution runs via stdio (`npm run mcp:start`) or HTTP (`/api/mcp`).
 */

import { MCPServer, type MCPServerResources } from '@mastra/mcp'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ContentType } from '@/shared/data/constants/protocol'
import {
  STUDIO_MCP_NOTE,
  STUDIO_MCP_TOOL_CATALOG,
  StudioMcpResourceDescription,
  StudioMcpResourceName,
  StudioMcpResourceUri,
  StudioMcpServerDescription,
  StudioMcpServerId,
  StudioMcpServerInstructions,
  StudioMcpServerName,
  StudioMcpServerVersion,
  StudioMcpToolInputCopy,
  StudioMcpTransportType,
} from '@/shared/agent-kernel/mastra/mcp/constants/studio-servers'

function studioMcpTool(id: string, description: string) {
  return createTool({
    id,
    description,
    inputSchema: z.object({
      input: z.string().optional().describe(StudioMcpToolInputCopy.FreeformInput),
    }),
    execute: async inputData => ({
      studio: true,
      toolId: id,
      message: STUDIO_MCP_NOTE,
      input: inputData,
    }),
  })
}

const studioTools = Object.fromEntries(
  STUDIO_MCP_TOOL_CATALOG.map(([id, description]) => [id, studioMcpTool(id, description)]),
)

const studioResources: MCPServerResources = {
  listResources: async () => [
    {
      uri: StudioMcpResourceUri.Projects,
      name: StudioMcpResourceName.Projects,
      description: StudioMcpResourceDescription.Projects,
      mimeType: ContentType.Json,
    },
    {
      uri: StudioMcpResourceUri.ProjectEntities,
      name: StudioMcpResourceName.ProjectEntities,
      description: StudioMcpResourceDescription.ProjectEntities,
      mimeType: ContentType.Json,
    },
    {
      uri: StudioMcpResourceUri.ProjectCharacters,
      name: StudioMcpResourceName.ProjectCharacters,
      description: StudioMcpResourceDescription.ProjectCharacters,
      mimeType: ContentType.Json,
    },
    {
      uri: StudioMcpResourceUri.ProjectEpisodes,
      name: StudioMcpResourceName.ProjectEpisodes,
      description: StudioMcpResourceDescription.ProjectEpisodes,
      mimeType: ContentType.Json,
    },
    {
      uri: StudioMcpResourceUri.ProjectSeriesBible,
      name: StudioMcpResourceName.SeriesBible,
      description: StudioMcpResourceDescription.SeriesBible,
      mimeType: ContentType.Json,
    },
    {
      uri: StudioMcpResourceUri.EpisodeBeats,
      name: StudioMcpResourceName.EpisodeBeats,
      description: StudioMcpResourceDescription.EpisodeBeats,
      mimeType: ContentType.Json,
    },
  ],
  getResourceContent: async ({ uri }) => ({
    text: JSON.stringify(
      {
        studio: true,
        uri,
        message: STUDIO_MCP_NOTE,
      },
      null,
      2,
    ),
  }),
}

export const worldBuildingKitMcpServer = new MCPServer({
  id: StudioMcpServerId.WorldBuildingKit,
  name: StudioMcpServerName.WorldBuildingKit,
  version: StudioMcpServerVersion.V1,
  description: StudioMcpServerDescription.WorldBuildingKit,
  instructions: StudioMcpServerInstructions.Default,
  tools: studioTools,
  resources: studioResources,
  remotes: [
    {
      transport_type: StudioMcpTransportType.Streamable,
      url: 'http://localhost:3000/api/mcp',
    },
  ],
})

export const studioMcpServers = {
  [StudioMcpServerId.WorldBuildingKit]: worldBuildingKitMcpServer,
}
