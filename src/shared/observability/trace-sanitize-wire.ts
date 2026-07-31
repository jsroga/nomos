export enum TraceSanitizeFallback {
  Empty = '(empty)',
  Redacted = '***REDACTED***',
  NoInputProvided = '(no input provided)',
  EmptyInput = '(empty input)',
  NoOutput = '(no output)',
  EmptyOutput = '(empty output)',
}

export function traceFieldFallback(key: string): string {
  return `(no ${key})`
}
