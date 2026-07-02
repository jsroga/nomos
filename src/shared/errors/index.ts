/**
 * @module shared/errors
 * 
 * Cross-module error utilities and stores.
 * 
 * Layer contract:
 * - MAY import: shared/types
 * - MAY NOT import: @/domains/*, @/app/*, @/db
 * - Consumers: all layers
 * 
 * Contents:
 * - error-utils.ts — error handling, serialization, logging
 * - useErrorStore.ts — client error UI state (Zustand)
 */

export * from './error-utils'
