import { env } from '@/shared/config/env'
import { AsyncLocalStorage } from 'async_hooks'
import { MCPServiceContext } from './types'
import { validateApiKey, getServiceContext } from './auth'
import {
  MCP_AUTH_INVALID_KEY_MESSAGE,
  MCP_AUTH_REQUIRED_MESSAGE,
} from './constants/request-context'

/**
 * AsyncLocalStorage store for request-scoped context.
 * This allows us to pass authentication info from the API route headers
 * down to the deep tool execution without threading arguments.
 */
export const requestContext = new AsyncLocalStorage<MCPServiceContext>()

/**
 * Get the current execution context.
 *
 * Strategy:
 * 1. Check AsyncLocalStorage (Active during HTTP requests in /api/mcp)
 * 2. Fallback to Environment Variables (Active during local stdio / mcp:dev)
 */
export async function getCurrentContext(): Promise<MCPServiceContext> {
  // 1. Try Request Scope (HTTP)
  const store = requestContext.getStore()
  if (store) {
    return store
  }

  // 2. Fallback to Environment (Stdio/Local)
  const apiKey = env.MCP_API_KEY
  if (!apiKey) {
    throw new Error(MCP_AUTH_REQUIRED_MESSAGE)
  }

  // We cache the validation result for the process lifetime if needed,
  // but for now re-validating is safer and fast enough for local dev.
  const authResult = await validateApiKey(apiKey)
  if (!authResult.valid) {
    throw new Error(MCP_AUTH_INVALID_KEY_MESSAGE)
  }

  return getServiceContext(authResult)
}
