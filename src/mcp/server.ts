import './env'
import { MCPServer } from '@mastra/mcp'
import { worldBuildingAgent, allTools } from './agent'
import { mcpResources } from './resources'

// Create the MCP Server
export const server = new MCPServer({
  name: 'World Building Kit',
  version: '1.0.0',
  description: 'MCP server for World Building Kit with observational memory.',
  tools: allTools,
  agents: {
    worldBuilding: worldBuildingAgent,
  },
  resources: mcpResources,
})
