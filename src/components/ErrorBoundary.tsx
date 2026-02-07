'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { useErrorStore } from '@/store/useErrorStore'

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
    console.error('ErrorBoundary caught error:', error, errorInfo)
    addErrorToStore(error, 'React Error Boundary')
  }

  public render() {
    if (this.state.hasError) {
      // Show fallback or error UI to break infinite loops
      return this.props.fallback || (
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
    }
    return this.props.children
  }
}

// Hook to listen for global errors
export function useGlobalErrorListener() {
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Skip Next.js HMR errors in dev
      if (event.message?.includes('hmr') || event.message?.includes('HMR')) {
        return
      }

      useErrorStore.getState().addError({
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        source: event.filename
          ? `${event.filename}:${event.lineno}:${event.colno}`
          : 'Window Error',
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      useErrorStore.getState().addError({
        message: error?.message || String(error) || 'Unhandled Promise Rejection',
        stack: error?.stack,
        source: 'Unhandled Promise Rejection',
      })
    }

    // Intercept console.error
    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
      // Call original first
      originalConsoleError.apply(console, args)

      // Skip our own error boundary logs to avoid loops
      const firstArg = String(args[0] || '')
      if (firstArg.includes('ErrorBoundary caught')) {
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
      const errorArg = args.find(arg => arg instanceof Error) as Error | undefined
      if (errorArg?.stack) {
        stack = errorArg.stack
      } else {
        // Create a stack trace to show where console.error was called
        const stackError = new Error()
        stack = stackError.stack?.split('\n').slice(2).join('\n') // Remove Error and console.error lines
      }

      useErrorStore.getState().addError({
        message: message || 'Console error',
        stack,
        source: 'console.error',
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      console.error = originalConsoleError
    }
  }, [])
}

// Wrapper component that includes global error listener
export function ErrorBoundary({ children, fallback }: Props) {
  useGlobalErrorListener()

  return <ErrorBoundaryClass fallback={fallback}>{children}</ErrorBoundaryClass>
}
