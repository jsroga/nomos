import { HttpStatus } from '@/shared/data/constants/protocol'
import { ClientFetchError } from '@/shared/data/fetch-json-record'

/** True when the API confirmed the project is missing or inaccessible (404). */
export function isMissingProjectError(error: unknown): boolean {
  return error instanceof ClientFetchError && error.status === HttpStatus.NOT_FOUND
}
