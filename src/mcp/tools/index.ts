/**
 * MCP Tools Registry
 *
 * Aggregates all tool definitions and provides handlers for tool execution.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { MCPServiceContext } from '../auth'
import { LangSmithContext } from '@/services/storyteller.service'

// Import tool modules
import * as entitiesTools from './entities'
import * as storytellerTools from './storyteller'
import * as tilesTools from './tiles'
import * as triggerTools from './trigger'

// ============================================
// TOOL AGGREGATION
// ============================================

/**
 * Get all available MCP tools
 */
export function getAllTools(): Tool[] {
  return [
    // Entities tools
    ...entitiesTools.tools,
    // Storyteller tools
    ...storytellerTools.tools,
    // Tiles and generation tools
    ...tilesTools.tools,
    // Trigger.dev run management tools
    ...triggerTools.tools,
  ]
}

// ============================================
// TOOL HANDLERS
// ============================================

type ToolHandler = (
  args: Record<string, any>,
  context: MCPServiceContext,
  langsmith: LangSmithContext
) => Promise<any>

const toolHandlers: Record<string, ToolHandler> = {
  // Entities
  ...entitiesTools.handlers,
  // Storyteller
  ...storytellerTools.handlers,
  // Tiles
  ...tilesTools.handlers,
  // Trigger
  ...triggerTools.handlers,
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
  const handler = toolHandlers[toolName]

  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`)
  }

  return handler(args, context, langsmith)
}

