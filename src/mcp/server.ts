import './env'
import { MCPServer } from '@mastra/mcp'
import { worldBuildingAgent, allTools } from './agent'
import { mcpResources } from './resources'
import {
  MCP_SERVER_DESCRIPTION,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
} from './constants/server'

// Create the MCP Server
export const server = new MCPServer({
  name: MCP_SERVER_NAME,
  version: MCP_SERVER_VERSION,
  description: MCP_SERVER_DESCRIPTION,
  tools: allTools,
  agents: {
    worldBuilding: worldBuildingAgent,
  },
  resources: mcpResources,
})
