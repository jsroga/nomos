/**
 * MCP Core Types
 *
 * Shared types used across all MCP domains.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { SupabaseClient } from '@supabase/supabase-js'

export interface MCPServiceContext {
  userId: string
  supabase: SupabaseClient
  apiKeyId: string
  apiKeyName: string
  scopes: string[]
}

export type ToolHandler = (
  args: Record<string, unknown>,
  context: MCPServiceContext,
) => Promise<unknown>

/**
 * Interface for domain modules to implement.
 * Each domain must export tools and handlers.
 */
export interface MCPDomainModule {
  tools: Tool[]
  handlers: Record<string, ToolHandler>
}
