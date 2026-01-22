/**
 * MCP Authentication
 *
 * API key validation and service context creation for MCP server.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { MCPServiceContext } from './types'

// ============================================
// TYPES
// ============================================

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
    throw new Error('Missing Supabase configuration')
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
    return { valid: false, error: 'No API key provided' }
  }

  // For development, allow a bypass key
  if (process.env.NODE_ENV === 'development' && apiKey === 'dev-test-key') {
    return {
      valid: true,
      keyId: 'dev-key',
      keyName: 'Development Key',
      userId: process.env.DEV_USER_ID || 'dev-user',
      scopes: ['*'],
    }
  }

  try {
    const supabase = getSupabaseServiceClient()

    // Hash the API key for lookup (keys are stored hashed)
    const keyHash = await hashApiKey(apiKey)

    const { data, error } = await supabase
      .from('mcp_api_keys')
      .select('id, name, user_id, scopes, is_active, expires_at')
      .eq('key_hash', keyHash)
      .single()

    if (error || !data) {
      return { valid: false, error: 'Invalid API key' }
    }

    // Check if key is active
    if (!data.is_active) {
      return { valid: false, error: 'API key is disabled' }
    }

    // Check if key has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'API key has expired' }
    }

    // Update last used timestamp
    await supabase
      .from('mcp_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)

    return {
      valid: true,
      keyId: data.id,
      keyName: data.name,
      userId: data.user_id,
      scopes: data.scopes || ['*'],
    }
  } catch (error) {
    console.error('[MCP Auth] Error validating API key:', error)
    return { valid: false, error: 'Authentication error' }
  }
}

/**
 * Create a service context for authenticated requests
 */
export async function getServiceContext(
  authResult: ApiKeyValidationResult
): Promise<MCPServiceContext> {
  if (!authResult.valid || !authResult.userId) {
    throw new Error('Invalid authentication result')
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

/**
 * Check if a scope is allowed for the API key
 */
export function hasScope(context: MCPServiceContext, requiredScope: string): boolean {
  // Wildcard allows all scopes
  if (context.scopes.includes('*')) {
    return true
  }

  // Check for exact match or prefix match (e.g., 'entities:*' matches 'entities:read')
  return context.scopes.some(scope => {
    if (scope === requiredScope) return true
    if (scope.endsWith(':*')) {
      const prefix = scope.slice(0, -1) // Remove '*'
      return requiredScope.startsWith(prefix)
    }
    return false
  })
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
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
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
  return `wbk_${key}` // Prefix for identification
}

/**
 * Create a new API key in the database
 */
export async function createApiKey(
  userId: string,
  name: string,
  scopes: string[] = ['*'],
  expiresAt?: Date
): Promise<{ apiKey: string; keyId: string }> {
  const supabase = getSupabaseServiceClient()
  const apiKey = generateApiKey()
  const keyHash = await hashApiKey(apiKey)

  const { data, error } = await supabase
    .from('mcp_api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: keyHash,
      scopes,
      expires_at: expiresAt?.toISOString(),
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`)
  }

  // Return the plain text key - this is the only time it's visible
  return { apiKey, keyId: data.id }
}
