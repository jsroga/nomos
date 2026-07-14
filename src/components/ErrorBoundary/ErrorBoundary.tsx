'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { useErrorStore } from '@/shared/errors/useErrorStore'
import {
  ErrorBoundaryLog,
  ErrorBoundaryMessage,
  ErrorBoundarySource,
  HmrErrorFragment,
} from '@/components/ErrorBoundary/constants/error-boundary'
import { DomEventType } from '@/shared/data/constants/protocol'

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

  public static getDerivedStateFromError(): State {
    return { hasError: true } // Block rendering to prevent infinite error loops
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(ErrorBoundaryLog.CaughtError, error, errorInfo)
    addErrorToStore(error, ErrorBoundarySource.React)
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

    // Intercept console.error
    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
      // Call original first
      originalConsoleError.apply(console, args)

      // Skip our own error boundary logs to avoid loops
      const firstArg = String(args[0] || '')
      if (firstArg.includes(ErrorBoundaryLog.CaughtPrefix)) {
        return
      }

      // Format the error message
      const message = args
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

      // Get stack trace from Error object if present, or create one
      let stack: string | undefined
      let errorArg: Error | undefined
      for (const arg of args) {
        if (arg instanceof Error) {
          errorArg = arg
          break
        }
      }
      if (errorArg?.stack) {
        stack = errorArg.stack
      } else {
        // Create a stack trace to show where console.error was called
        const stackError = new Error()
        stack = stackError.stack?.split('\n').slice(2).join('\n') // Remove Error and console.error lines
      }

      useErrorStore.getState().addError({
        message: message || ErrorBoundaryMessage.ConsoleError,
        stack,
        source: ErrorBoundarySource.ConsoleError,
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
