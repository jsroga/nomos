/** MCP API key authentication — wire values, DB columns, and error messages. */

import { DB_COLUMN } from '@/shared/data/constants/db-tables'
import { NodeEnv } from '@/shared/data/constants/protocol'

export const MCP_API_KEYS_TABLE = 'mcp_api_keys'

// Not an enum: members alias DB_COLUMN string-enum values, which TS forbids as
// computed enum values. A frozen const map gives the same value access.
export const McpApiKeyColumn = {
  Id: DB_COLUMN.ID,
  Name: DB_COLUMN.NAME,
  UserId: DB_COLUMN.USER_ID,
  Scopes: DB_COLUMN.SCOPES,
  KeyHash: DB_COLUMN.KEY_HASH,
  IsActive: 'is_active',
  ExpiresAt: DB_COLUMN.EXPIRES_AT,
  LastUsedAt: DB_COLUMN.LAST_USED_AT,
} as const

export const MCP_API_KEY_LOOKUP_SELECT = [
  McpApiKeyColumn.Id,
  McpApiKeyColumn.Name,
  McpApiKeyColumn.UserId,
  McpApiKeyColumn.Scopes,
  McpApiKeyColumn.IsActive,
  McpApiKeyColumn.ExpiresAt,
].join(', ')

export enum McpAuthDevBypass {
  ApiKey = 'dev-test-key',
  KeyId = 'dev-key',
  KeyName = 'Development Key',
  UserId = 'dev-user',
}

export enum McpAuthScope {
  Wildcard = '*',
  WildcardSuffix = ':*',
}

export enum McpAuthError {
  MissingSupabaseConfig = 'Missing Supabase configuration',
  NoApiKeyProvided = 'No API key provided',
  InvalidApiKey = 'Invalid API key',
  ApiKeyDisabled = 'API key is disabled',
  ApiKeyExpired = 'API key has expired',
  AuthenticationError = 'Authentication error',
  InvalidAuthResult = 'Invalid authentication result',
}

export enum McpAuthLog {
  ValidateError = '[MCP Auth] Error validating API key:',
}

export enum McpApiKeyPrefix {
  Wbk = 'wbk_',
}

export enum McpHashAlgorithm {
  Sha256 = 'SHA-256',
}

export { NodeEnv }
