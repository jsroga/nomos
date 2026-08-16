import {
  ErrorBoundaryLog,
  ReactConsoleNoise,
} from '@/components/ErrorBoundary/constants/error-boundary'

export function shouldCaptureConsoleError(message: string): boolean {
  if (message.includes(ErrorBoundaryLog.CaughtPrefix)) return false
  if (message.includes(ReactConsoleNoise.GetSnapshotCached)) return false
  if (message.includes(ReactConsoleNoise.CannotUpdateWhileRendering)) return false
  if (message.includes(ReactConsoleNoise.MaxUpdateDepth)) return false
  return true
}

export function formatConsoleErrorMessage(args: unknown[]): string {
  return args
    .map(arg => {
      if (arg instanceof Error) return arg.message
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg)
        } catch {
          return String(arg)
        }
      }
      return String(arg)
    })
    .join(' ')
}

export function stackFromConsoleErrorArgs(args: unknown[]): string | undefined {
  for (const arg of args) {
    if (arg instanceof Error && arg.stack) return arg.stack
  }
  const stackError = new Error()
  return stackError.stack?.split('\n').slice(2).join('\n')
}
