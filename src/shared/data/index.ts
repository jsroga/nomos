// shared/data barrel
// Cross-module data utilities, services, hooks, and external API clients
export * from './utils'
export * from './deep-merge'
export * from './json-guards'
export * from './api-utils'
export * from './url-builder'
export * from './entities-service'
export * from './generation/tiles-service'
export * from './queries/useGameEntities'
export * from './useProjectFromUrl'

// ServiceContext/ServiceError/ServiceErrorCode and GameEntity are declared in
// more than one of the modules above; EntitiesService is the canonical source,
// so re-export those names explicitly to resolve the star-export ambiguity.
export { ServiceError } from './entities-service'
export type { ServiceContext, ServiceErrorCode, GameEntity } from './entities-service'
