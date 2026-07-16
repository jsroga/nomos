import type { EntityType } from './reference-parser'
import { STORY_ENTITY_TYPES } from './constants/entity-types'

export function parseEntityType(value: unknown): EntityType | undefined {
  if (typeof value !== 'string') return undefined
  for (const type of STORY_ENTITY_TYPES) {
    if (type === value) return type
  }
  return undefined
}

export function entityMetadata(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value))
  }
  return {}
}
