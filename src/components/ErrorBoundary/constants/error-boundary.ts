export enum ErrorBoundaryLog {
  CaughtError = 'ErrorBoundary caught error:',
  CaughtPrefix = 'ErrorBoundary caught',
}

export enum ErrorBoundarySource {
  React = 'React Error Boundary',
  Window = 'Window Error',
  UnhandledRejection = 'Unhandled Promise Rejection',
  ConsoleError = 'console.error',
}

export enum ErrorBoundaryMessage {
  Unknown = 'Unknown error',
  ConsoleError = 'Console error',
  UnhandledRejection = 'Unhandled Promise Rejection',
}

/** React logs these via console.error during render; capturing them re-enters setState. */
export enum ReactConsoleNoise {
  GetSnapshotCached = 'getSnapshot should be cached',
  CannotUpdateWhileRendering = 'Cannot update a component',
  MaxUpdateDepth = 'Maximum update depth exceeded',
}

export enum HmrErrorFragment {
  Lower = 'hmr',
  Upper = 'HMR',
}

export enum NodeEnv {
  Development = 'development',
}

/** One Fast Refresh retry after a stale-module ReferenceError. */
export const ERROR_BOUNDARY_HMR_RETRY_MS = 100
