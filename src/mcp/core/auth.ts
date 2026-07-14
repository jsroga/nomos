/**
 * MCP Authentication
 *
 * API key validation and service context creation for MCP server.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  MCP_API_KEY_LOOKUP_SELECT,
  MCP_API_KEYS_TABLE,
  McpApiKeyColumn,
  McpApiKeyPrefix,
  McpAuthDevBypass,
  McpAuthError,
  McpAuthLog,
  McpAuthScope,
  McpHashAlgorithm,
  NodeEnv,
} from '@/mcp/constants/auth'
import { MCPServiceContext } from './types'

// ============================================
// TYPES
// ============================================

// Column inference fails when .select() gets a runtime-built string, so we
// declare the row shape and apply it via .returns<T>() (no cast).
interface McpApiKeyRow {
  id: string
  name: string
  user_id: string
  scopes: string[] | null
  is_active: boolean
  expires_at: string | null
}

export interface ApiKeyValidationResult {
  valid: boolean
  keyId?: string
  keyName?: string
  userId?: string
  scopes?: string[]
  error?: string
}

// ============================================
// SUPABASE CLIENT
// ============================================

function getSupabaseServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(McpAuthError.MissingSupabaseConfig)
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// ============================================
// API KEY VALIDATION
// ============================================

/**
 * Validate an API key against the database
 */
export async function validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
  if (!apiKey) {
    return { valid: false, error: McpAuthError.NoApiKeyProvided }
  }

  // For development, allow a bypass key
  if (process.env.NODE_ENV === NodeEnv.Development && apiKey === McpAuthDevBypass.ApiKey) {
    return {
      valid: true,
      keyId: McpAuthDevBypass.KeyId,
      keyName: McpAuthDevBypass.KeyName,
      userId: process.env.DEV_USER_ID || McpAuthDevBypass.UserId,
      scopes: [McpAuthScope.Wildcard],
    }
  }

  try {
    const supabase = getSupabaseServiceClient()

    // Hash the API key for lookup (keys are stored hashed)
    const keyHash = await hashApiKey(apiKey)

    const { data, error } = await supabase
      .from(MCP_API_KEYS_TABLE)
      .select(MCP_API_KEY_LOOKUP_SELECT)
      .eq(McpApiKeyColumn.KeyHash, keyHash)
      .single()
      .returns<McpApiKeyRow>()

    if (error || !data) {
      return { valid: false, error: McpAuthError.InvalidApiKey }
    }

    // Check if key is active
    if (!data.is_active) {
      return { valid: false, error: McpAuthError.ApiKeyDisabled }
    }

    // Check if key has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: McpAuthError.ApiKeyExpired }
    }

    // Update last used timestamp
    await supabase
      .from(MCP_API_KEYS_TABLE)
      .update({ [McpApiKeyColumn.LastUsedAt]: new Date().toISOString() })
      .eq(McpApiKeyColumn.Id, data.id)

    return {
      valid: true,
      keyId: data.id,
      keyName: data.name,
      userId: data.user_id,
      scopes: data.scopes || [McpAuthScope.Wildcard],
    }
  } catch (error) {
    console.error(McpAuthLog.ValidateError, error)
    return { valid: false, error: McpAuthError.AuthenticationError }
  }
}

/**
 * Create a service context for authenticated requests
 */
export async function getServiceContext(
  authResult: ApiKeyValidationResult
): Promise<MCPServiceContext> {
  if (!authResult.valid || !authResult.userId) {
    throw new Error(McpAuthError.InvalidAuthResult)
  }

  const supabase = getSupabaseServiceClient()

  return {
    userId: authResult.userId,
    supabase,
    apiKeyId: authResult.keyId!,
    apiKeyName: authResult.keyName!,
    scopes: authResult.scopes || [],
  }
}


// ============================================
// UTILITIES
// ============================================

/**
 * Hash an API key for storage/lookup
 * Uses SHA-256 for consistent hashing
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest(McpHashAlgorithm.Sha256, data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const key = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `${McpApiKeyPrefix.Wbk}${key}` // Prefix for identification
}
