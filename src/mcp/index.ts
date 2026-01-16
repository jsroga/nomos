/**
 * MCP Module Index
 *
 * Export all MCP components for external use.
 */

export { authenticateMCPRequest, hasScope, requireScope, generateApiKey, hashApiKey } from './auth'
export type { MCPAuthContext } from './auth'
export { entityTools, handleEntityTool } from './tools/entities'
export { storytellerTools, handleStorytellerTool } from './tools/storyteller'
export { tileTools, handleTileTool } from './tools/tiles'

