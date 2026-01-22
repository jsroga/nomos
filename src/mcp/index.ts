/**
 * MCP Module Index
 *
 * Export all MCP components for external use.
 */

// Core exports
export * from './core'

// Domain exports
export { getAllTools, handleToolCall, listDomains, getDomainInfo } from './domains'

// Resource exports
export { getAllResources, handleResourceRead } from './resources'
