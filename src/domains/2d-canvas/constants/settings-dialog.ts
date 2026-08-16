export enum SettingsDialogTab {
  General = 'general',
  McpKeys = 'mcpkeys',
}

export const SETTINGS_PROVIDER_PROBE_ENDPOINT = '/api/settings/providers/probe'
export const SETTINGS_PROVIDERS_ENDPOINT = '/api/settings/providers'
export const SETTINGS_API_KEYS_ENDPOINT = '/api/api-keys'

export const SETTINGS_TEST_REQUEST_FAILED = 'Test request failed'

export const SETTINGS_LOAD_PROVIDERS_FAILED_LOG = 'Failed to load provider status:'
export const SETTINGS_LOAD_MCP_KEYS_FAILED_LOG = 'Failed to load MCP keys:'
export const SETTINGS_MCP_KEY_NAME_REQUIRED = 'Please enter a key name'
export const SETTINGS_MCP_CREATE_KEY_FAILED = 'Failed to create key'
export const SETTINGS_MCP_KEY_CREATED_TOAST = 'API key created! Save it now.'
export const SETTINGS_MCP_CREATE_KEY_FAILED_TOAST = 'Failed to create API key'
export const SETTINGS_MCP_REVOKE_KEY_FAILED = 'Failed to revoke key'
export const SETTINGS_MCP_KEY_REVOKED_TOAST = 'API key revoked'
export const SETTINGS_COPIED_TOAST = 'Copied to clipboard!'
export const SETTINGS_CLOSE_LABEL = 'Close'
