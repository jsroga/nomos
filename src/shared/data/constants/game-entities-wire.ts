/** Game entities API query params, client errors, and log prefixes. */

export enum GameEntityQueryParam {
  ProjectId = 'projectId',
  EntityType = 'entityType',
  SourceDomain = 'sourceDomain',
  Search = 'search',
}

export enum GameEntityClientLog {
  FetchError = '[useGameEntities] Error:',
  CreateError = '[useGameEntities] Create error:',
  UpdateError = '[useGameEntities] Update error:',
  DeleteError = '[useGameEntities] Delete error:',
}

export enum DomAbortErrorName {
  AbortError = 'AbortError',
}
