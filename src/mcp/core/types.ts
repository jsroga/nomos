/**
 * MCP Core Types
 *
 * Shared types used across all MCP domains.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { SupabaseClient } from '@supabase/supabase-js'

// ============================================
// SERVICE CONTEXT
// ============================================

export interface MCPServiceContext {
  userId: string
  supabase: SupabaseClient
  apiKeyId: string
  apiKeyName: string
  scopes: string[]
}

// ============================================
// LANGSMITH CONTEXT
// ============================================

export interface LangSmithContext {
  runName?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

// ============================================
// TOOL HANDLER
// ============================================

export type ToolHandler = (
  args: Record<string, unknown>,
  context: MCPServiceContext,
  langsmith: LangSmithContext
) => Promise<any>

// ============================================
// DOMAIN MODULE
// ============================================

/**
 * Interface for domain modules to implement.
 * Each domain must export tools and handlers.
 */
export interface MCPDomainModule {
  /**
   * Array of MCP Tool definitions for this domain
   */
  tools: Tool[]

  /**
   * Map of tool names to their handler functions
   */
  handlers: Record<string, ToolHandler>
}
