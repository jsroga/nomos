/**
 * @module shared/data
 * 
 * Cross-module data utilities, services, hooks, and external API clients.
 * 
 * Layer contract:
 * - MAY import: @/db, shared/errors, shared/types
 * - MAY NOT import: @/domains/*, @/app/*
 * - Consumers: domains/*/services, domains/*/ui, app/api
 * 
 * Subdirectories:
 * - queries/ — TanStack Query hooks for cross-module data
 * - generation/ — Asset generation services (tiles, 3D, portraits)
 * - external-apis/ — Third-party API clients (Replicate, Meshy, etc.)
 */

export * from './utils'
