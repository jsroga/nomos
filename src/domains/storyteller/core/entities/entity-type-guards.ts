import type { EntityType } from './ReferenceParser'

const ENTITY_TYPES: EntityType[] = [
  'character',
  'place',
  'event',
  'faction',
  'rule',
  'beat',
  'episode',
  'item',
]

export function parseEntityType(value: unknown): EntityType | undefined {
  if (typeof value !== 'string') return undefined
  for (const type of ENTITY_TYPES) {
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
