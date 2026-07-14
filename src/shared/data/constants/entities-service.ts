/** EntitiesService wire values — errors, logs, and service error codes. */

export enum EntitiesServiceErrorCode {
  NotFound = 'NOT_FOUND',
  Unauthorized = 'UNAUTHORIZED',
  ValidationError = 'VALIDATION_ERROR',
  InternalError = 'INTERNAL_ERROR',
  RateLimited = 'RATE_LIMITED',
}

export enum EntitiesServiceErrorName {
  ServiceError = 'ServiceError',
}

export enum EntitiesServiceLog {
  FetchError = '[EntitiesService] Error fetching entities:',
  CreateError = '[EntitiesService] Error creating entity:',
  UpdateError = '[EntitiesService] Error updating entity:',
  DeleteError = '[EntitiesService] Error deleting entity:',
}
