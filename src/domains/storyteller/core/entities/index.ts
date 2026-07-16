// Core entities barrel - entity extraction, references, parsing
export * from './entity-extractor'
export * from './entity-references'
export * from './reference-parser'
export * from './entity-type-guards'

// Both EntityReferences and ReferenceParser export an `EntityType`; the
// ReferenceParser one (superset — includes 'item') is canonical for the barrel.
export type { EntityType } from './reference-parser'
