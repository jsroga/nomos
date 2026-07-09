// Core entities barrel - entity extraction, references, parsing
export * from './EntityExtractor'
export * from './EntityReferences'
export * from './ReferenceParser'
export * from './entity-type-guards'

// Both EntityReferences and ReferenceParser export an `EntityType`; the
// ReferenceParser one (superset — includes 'item') is canonical for the barrel.
export type { EntityType } from './ReferenceParser'
