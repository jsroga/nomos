/**
 * Entity reference ID helpers and parsing pattern.
 */

import { v4 as uuidv4 } from 'uuid'
import {
  ENTITY_PREFIXES,
  PREFIX_TO_TYPE,
  type EntityType,
} from '@/domains/storyteller/core/entities/reference-parser'

export { ENTITY_PREFIXES, PREFIX_TO_TYPE } from '@/domains/storyteller/core/entities/reference-parser'
export type { EntityType } from '@/domains/storyteller/core/entities/reference-parser'

export const REFERENCE_PATTERN = /\[([^\]]+)\]\[([a-z]+-[a-zA-Z0-9-]+)\]/g

export function getEntityTypeFromId(refId: string): EntityType | null {
  const prefix = refId.split('-')[0]
  return PREFIX_TO_TYPE[prefix] || null
}

export function displayNameFromRefId(refId: string): string {
  return refId
    .split('-')
    .slice(1)
    .join('-')
    .replace(/-/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function generateReferenceId(type: EntityType): string {
  const prefix = ENTITY_PREFIXES[type]
  const shortUuid = uuidv4().split('-')[0]
  return `${prefix}-${shortUuid}`
}
