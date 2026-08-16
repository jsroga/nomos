export enum EntityRegistryLog {
  PersistFailed = '[EntityRegistry] Failed to persist entity:',
  DbLookupFailed = '[EntityRegistry] DB lookup failed:',
  ResolveFailed = '[EntityRegistry] Failed to resolve entity:',
  ResolveEntitiesFailed = '[EntityRegistry] Failed to resolve entities:',
  ProjectEntitiesFailed = '[EntityRegistry] Failed to get project entities:',
  EntitiesByTypeFailed = '[EntityRegistry] Failed to get entities by type:',
  UpdateReferenceFailed = '[EntityRegistry] Failed to update reference timestamp:',
  UpdateDescriptionFailed = '[EntityRegistry] Failed to update description:',
  DeleteFailed = '[EntityRegistry] Failed to delete entity:',
}

export enum EntityRegistryNote {
  AutoRegistered = 'Auto-registered',
}
