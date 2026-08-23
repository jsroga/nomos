'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { useErrorStore } from '@/shared/errors/useErrorStore'
import {
  ErrorBoundaryLog,
  ErrorBoundaryMessage,
  ErrorBoundarySource,
  HmrErrorFragment,
  ERROR_BOUNDARY_HMR_RETRY_MS,
  NodeEnv,
} from '@/components/ErrorBoundary/constants/error-boundary'
import { DomEventType } from '@/shared/data/constants/protocol'
import {
  formatConsoleErrorMessage,
  isBenignUnmountRace,
  shouldCaptureConsoleError,
  stackFromConsoleErrorArgs,
} from '@/components/ErrorBoundary/should-capture-console-error'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

// Helper to add error from class component
const addErrorToStore = (error: Error, source?: string) => {
  useErrorStore.getState().addError({
    message: error.message,
    stack: error.stack,
    source,
  })
}

class ErrorBoundaryClass extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }
  private hmrRetryTimer: ReturnType<typeof setTimeout> | undefined
  private hmrRetryUsed = false

  public static getDerivedStateFromError(error: Error): State {
    if (isBenignUnmountRace(error.message)) return { hasError: false }
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isBenignUnmountRace(error.message)) return
    console.error(ErrorBoundaryLog.CaughtError, error, errorInfo)
    addErrorToStore(error, ErrorBoundarySource.React)

    if (
      process.env.NODE_ENV !== NodeEnv.Development ||
      this.hmrRetryUsed ||
      !(error instanceof ReferenceError)
    ) {
      return
    }
    this.hmrRetryUsed = true
    this.hmrRetryTimer = setTimeout(() => {
      this.setState({ hasError: false })
    }, ERROR_BOUNDARY_HMR_RETRY_MS)
  }

  public componentWillUnmount() {
    if (this.hmrRetryTimer !== undefined) clearTimeout(this.hmrRetryTimer)
  }

  public render() {
    if (this.state.hasError) {
      // Show fallback or error UI to break infinite loops
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center space-y-4">
              <p className="text-red-500 font-medium">Something went wrong</p>
              <p className="text-muted-foreground text-sm">Check console for details</p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded text-sm transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}

// Hook to listen for global errors
export function useGlobalErrorListener() {
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Skip Next.js HMR errors in dev
      if (event.message?.includes(HmrErrorFragment.Lower) || event.message?.includes(HmrErrorFragment.Upper)) {
        return
      }
      if (!shouldCaptureConsoleError(event.message || '')) return

      useErrorStore.getState().addError({
        message: event.message || ErrorBoundaryMessage.Unknown,
        stack: event.error?.stack,
        source: event.filename
          ? `${event.filename}:${event.lineno}:${event.colno}`
          : ErrorBoundarySource.Window,
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      useErrorStore.getState().addError({
        message: error?.message || String(error) || ErrorBoundaryMessage.UnhandledRejection,
        stack: error?.stack,
        source: ErrorBoundarySource.UnhandledRejection,
      })
    }

    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
      originalConsoleError.apply(console, args)

      const message = formatConsoleErrorMessage(args)
      if (!shouldCaptureConsoleError(message)) return

      const stack = stackFromConsoleErrorArgs(args)
      queueMicrotask(() => {
        useErrorStore.getState().addError({
          message: message || ErrorBoundaryMessage.ConsoleError,
          stack,
          source: ErrorBoundarySource.ConsoleError,
        })
      })
    }

    window.addEventListener(DomEventType.Error, handleError)
    window.addEventListener(DomEventType.UnhandledRejection, handleUnhandledRejection)

    return () => {
      window.removeEventListener(DomEventType.Error, handleError)
      window.removeEventListener(DomEventType.UnhandledRejection, handleUnhandledRejection)
      console.error = originalConsoleError
    }
  }, [])
}

// Wrapper component that includes global error listener
export function ErrorBoundary({ children, fallback }: Props) {
  useGlobalErrorListener()

  return <ErrorBoundaryClass fallback={fallback}>{children}</ErrorBoundaryClass>
}
