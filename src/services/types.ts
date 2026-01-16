/**
 * Core Service Layer Types
 *
 * Shared input/output types for services used by both REST API and MCP
 */

import { z } from 'zod'

// =============================================================================
// Entity Types
// =============================================================================

export const EntityType = z.enum([
  'character',
  'location',
  'mechanic',
  'faction',
  'item',
  'quest',
])
export type EntityType = z.infer<typeof EntityType>

export const SourceDomain = z.enum([
  'storyteller',
  'loop-creator',
  'interior-designer',
  'world-building',
])
export type SourceDomain = z.infer<typeof SourceDomain>

export const RelationshipType = z.enum([
  'uses',
  'located_in',
  'conflicts_with',
  'allies_with',
  'owns',
  'part_of',
])
export type RelationshipType = z.infer<typeof RelationshipType>

// Entity Input Schemas
export const ListEntitiesInput = z.object({
  projectId: z.string().uuid(),
  entityType: EntityType.optional(),
  sourceDomain: SourceDomain.optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
})
export type ListEntitiesInput = z.infer<typeof ListEntitiesInput>

export const GetEntityInput = z.object({
  entityId: z.string().uuid(),
})
export type GetEntityInput = z.infer<typeof GetEntityInput>

export const CreateEntityInput = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  entityType: EntityType,
  name: z.string().min(1),
  description: z.string().optional(),
  sourceDomain: SourceDomain,
  sourceEntityId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
})
export type CreateEntityInput = z.infer<typeof CreateEntityInput>

export const UpdateEntityInput = z.object({
  entityId: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
  usedInDomains: z.array(z.string()).optional(),
})
export type UpdateEntityInput = z.infer<typeof UpdateEntityInput>

export const DeleteEntityInput = z.object({
  entityId: z.string().uuid(),
})
export type DeleteEntityInput = z.infer<typeof DeleteEntityInput>

// Relationship Input Schemas
export const ListRelationshipsInput = z.object({
  entityId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
})
export type ListRelationshipsInput = z.infer<typeof ListRelationshipsInput>

export const CreateRelationshipInput = z.object({
  projectId: z.string().uuid(),
  fromEntityId: z.string().uuid(),
  toEntityId: z.string().uuid(),
  relationshipType: RelationshipType,
  metadata: z.record(z.any()).optional(),
})
export type CreateRelationshipInput = z.infer<typeof CreateRelationshipInput>

export const DeleteRelationshipInput = z.object({
  relationshipId: z.string().uuid(),
})
export type DeleteRelationshipInput = z.infer<typeof DeleteRelationshipInput>

// Entity Output Types
export interface Entity {
  id: string
  projectId: string
  userId: string
  entityType: EntityType
  name: string
  description: string | null
  sourceDomain: SourceDomain
  sourceEntityId: string | null
  usedInDomains: string[]
  metadata: Record<string, unknown>
  tags: string[]
  imageUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface EntityRelationship {
  id: string
  projectId: string
  fromEntityId: string
  toEntityId: string
  relationshipType: RelationshipType
  metadata: Record<string, unknown>
  createdAt: Date
  fromEntity?: Entity
  toEntity?: Entity
}

export interface ListEntitiesOutput {
  entities: Entity[]
  total: number
}

export interface ListRelationshipsOutput {
  relationships: EntityRelationship[]
}

// =============================================================================
// Service Error Types
// =============================================================================

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      'NOT_FOUND',
      404
    )
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends ServiceError {
  constructor(
    message: string,
    public details?: z.ZodError['errors']
  ) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

// =============================================================================
// Async Operation Types (for Trigger.dev tasks)
// =============================================================================

export interface AsyncOperationStarted {
  status: 'started'
  runId: string
  message?: string
}

export interface AsyncOperationStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  runId: string
  progress?: number
  stage?: string
  output?: unknown
  error?: string
}

// =============================================================================
// Database Client Type
// =============================================================================

export type { db as DrizzleClient } from '@/db'

