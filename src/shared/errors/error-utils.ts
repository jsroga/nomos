function hasMessageField(error: unknown): error is { message: unknown } {
  return typeof error === 'object' && error !== null && 'message' in error
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (hasMessageField(error)) {
    return String(error.message)
  }
  return String(error)
}

export function toError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(getErrorMessage(error))
}
