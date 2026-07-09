/**
 * Wire protocol constants — HTTP, API errors, headers.
 * Use these instead of inline string literals in routes and services.
 */

export enum ApiErrorMessage {
  UNAUTHORIZED = 'Unauthorized',
  INVALID_ACTION = 'Invalid action',
  PROJECT_NOT_FOUND = 'Project not found or access denied',
  EPISODE_NOT_FOUND = 'Episode not found or access denied',
  PROJECT_ID_REQUIRED = 'Project ID required',
  INTERNAL_ERROR = 'Internal server error',
}

export enum HttpHeader {
  TRACE_ID = 'x-trace-id',
}

export enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  INTERNAL = 500,
}

export enum ActionApiResultType {
  BIBLE_UPDATED = 'bible_updated',
}
