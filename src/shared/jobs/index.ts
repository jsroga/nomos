/**
 * @module shared/jobs
 * 
 * Cross-module job status types, hooks, and Trigger.dev utilities.
 * 
 * Layer contract:
 * - MAY import: @/db, shared/errors, shared/types
 * - MAY NOT import: @/domains/*, @/app/*
 * - Consumers: domains/*/ui (useJob), app/api
 */

// Empty barrel — populated in future increments
