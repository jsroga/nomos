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

export enum HmrErrorFragment {
  Lower = 'hmr',
  Upper = 'HMR',
}
