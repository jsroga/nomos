/**
 * MCP Domains Registry
 *
 * Aggregates all domain modules and provides unified tool/handler access.
 * Each domain is a self-contained module with its own tools and handlers.
 *
 * TO ADD A NEW DOMAIN:
 * 1. Create folder: src/mcp/domains/<domain-name>/
 * 2. Create tools.ts exporting default MCPDomainModule
 * 3. Import and register here
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { MCPDomainModule, MCPServiceContext, LangSmithContext, ToolHandler } from '../core/types'

// ============================================
// IMPORT DOMAIN MODULES
// ============================================

import entitiesModule from './entities/tools'
import storytellerModule from './storyteller/tools'
import generationModule from './generation/tools'
import triggerModule from './trigger/tools'
import loopCreatorModule from './loop-creator/tools'
import interiorDesignerModule from './interior-designer/tools'
import worldBuildingModule from './world-building/tools'

// ============================================
// DOMAIN REGISTRY
// ============================================

/**
 * All registered domain modules.
 * Order determines tool listing order.
 */
const domainModules: Record<string, MCPDomainModule> = {
  entities: entitiesModule,
  storyteller: storytellerModule,
  generation: generationModule,
  trigger: triggerModule,
  'loop-creator': loopCreatorModule,
  'interior-designer': interiorDesignerModule,
  'world-building': worldBuildingModule,
}

// ============================================
// AGGREGATION FUNCTIONS
// ============================================

/**
 * Get all tools from all domains
 */
export function getAllTools(): Tool[] {
  const allTools: Tool[] = []

  for (const [domainName, module] of Object.entries(domainModules)) {
    // Add domain prefix to tool descriptions for clarity
    for (const tool of module.tools) {
      allTools.push({
        ...tool,
        description: `[${domainName}] ${tool.description}`,
      })
    }
  }

  return allTools
}

/**
 * Get tools for a specific domain
 */
export function getDomainTools(domainName: string): Tool[] {
  const module = domainModules[domainName]
  if (!module) {
    throw new Error(`Unknown domain: ${domainName}`)
  }
  return module.tools
}

/**
 * Get all handlers from all domains
 */
function getAllHandlers(): Record<string, ToolHandler> {
  const allHandlers: Record<string, ToolHandler> = {}

  for (const module of Object.values(domainModules)) {
    Object.assign(allHandlers, module.handlers)
  }

  return allHandlers
}

/**
 * Execute a tool call
 */
export async function handleToolCall(
  toolName: string,
  args: Record<string, any>,
  context: MCPServiceContext,
  langsmith: LangSmithContext
): Promise<any> {
  const allHandlers = getAllHandlers()
  const handler = allHandlers[toolName]

  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`)
  }

  return handler(args, context, langsmith)
}

/**
 * List all available domains
 */
export function listDomains(): string[] {
  return Object.keys(domainModules)
}

/**
 * Get domain info (tool count, etc.)
 */
export function getDomainInfo(): Array<{ name: string; toolCount: number; implemented: boolean }> {
  return Object.entries(domainModules).map(([name, module]) => ({
    name,
    toolCount: module.tools.length,
    implemented: module.tools.length > 0,
  }))
}
