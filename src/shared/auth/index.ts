/**
 * @module shared/auth
 * 
 * Cross-module authentication and authorization utilities.
 * 
 * Layer contract:
 * - MAY import: @/db, shared/errors, shared/types
 * - MAY NOT import: @/domains/*, @/app/*
 * - Consumers: domains/*/services, app/api, app/middleware
 * 
 * Contents:
 * - auth.ts — session management, JWT utilities
 * - validation.ts — auth Zod schemas
 * - security.ts — encryption, hashing, CSRF protection
 * - useAuthStore.ts — client auth state (Zustand)
 */

export * from './auth'
