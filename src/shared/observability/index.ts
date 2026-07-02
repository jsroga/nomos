/**
 * @module shared/observability
 * 
 * Cross-module tracing, logging, and monitoring.
 * 
 * Layer contract:
 * - MAY import: shared/types
 * - MAY NOT import: @/domains/*, @/app/*, @/db
 * - Consumers: all layers (instrumentation)
 * 
 * Contents (from Increment 2):
 * - observability.ts — Langfuse + OpenTelemetry wiring (from agent-core/)
 * - langfuse-sync.ts — prompt sync utilities (from prompts/)
 */

// Empty barrel — populated in Increment 2 (Item 5)
