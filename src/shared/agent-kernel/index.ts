/**
 * @module shared/agent-kernel
 * 
 * Cross-module AI agent primitives — Mastra wiring, memory, skills, judging, workspace.
 * 
 * Layer contract:
 * - MAY import: @/db, shared/* (not other agent-kernel modules)
 * - MAY NOT import: @/domains/*, @/app/*
 * - Consumers: domains/*/agents, shared/observability
 */

// Empty barrel — populated in Increment 2 (Items 5-6)
