/**
 * React hook for subscribing to Trigger.dev run updates in realtime
 * Replaces polling-based status checking with SSE-based subscriptions
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRealtimeRun } from '@trigger.dev/react-hooks'

type RunStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'EXECUTING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED'
  | 'TIMED_OUT'
  | 'CRASHED'
  | 'SYSTEM_FAILURE'

interface RealtimeRunState<T = unknown> {
  status: RunStatus
  output?: T
  error?: string
  metadata?: Record<string, unknown>
  isLoading: boolean
  isComplete: boolean
  isError: boolean
}

interface UseTriggerRealtimeOptions<T> {
  onComplete?: (output: T) => void
  onError?: (error: string) => void
  onProgress?: (metadata: Record<string, unknown>) => void
}

/**
 * Hook to subscribe to a Trigger.dev run in realtime
 * Automatically fetches access token and subscribes to updates
 */
export function useTriggerRealtime<T = unknown>(
  runId: string | null,
  options: UseTriggerRealtimeOptions<T> = {}
): RealtimeRunState<T> {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const callbacksRef = useRef(options)

  // Keep callbacks ref updated
  callbacksRef.current = options

  // Fetch access token when runId changes
  useEffect(() => {
    if (!runId) {
      setAccessToken(null)
      return
    }

    const fetchToken = async () => {
      try {
        const response = await fetch('/api/trigger/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runIds: [runId] }),
        })

        if (!response.ok) {
          throw new Error('Failed to get access token')
        }

        const { token } = await response.json()
        setAccessToken(token)
        setTokenError(null)
      } catch (error) {
        console.error('Failed to fetch trigger token:', error)
        setTokenError(error instanceof Error ? error.message : 'Token fetch failed')
      }
    }

    fetchToken()
  }, [runId])

  // Use Trigger.dev realtime hook
  const { run, error } = useRealtimeRun(runId!, {
    accessToken: accessToken || '',
    enabled: !!runId && !!accessToken,
    onComplete: completedRun => {
      if (callbacksRef.current.onComplete && completedRun.output) {
        callbacksRef.current.onComplete(completedRun.output as T)
      }
    },
  })

  // Track previous status for change detection
  const prevStatusRef = useRef<RunStatus | null>(null)
  const prevMetadataRef = useRef<string>('')

  // Handle status changes and progress updates
  useEffect(() => {
    if (!run) return

    const currentMetadata = JSON.stringify(run.metadata || {})

    // Call onProgress when metadata changes
    if (currentMetadata !== prevMetadataRef.current && callbacksRef.current.onProgress) {
      callbacksRef.current.onProgress(run.metadata as Record<string, unknown>)
    }
    prevMetadataRef.current = currentMetadata

    // Handle completion
    if (run.status === 'COMPLETED' && prevStatusRef.current !== 'COMPLETED') {
      if (callbacksRef.current.onComplete && run.output) {
        callbacksRef.current.onComplete(run.output as T)
      }
    }

    // Handle errors
    if (
      ['FAILED', 'CANCELED', 'TIMED_OUT', 'CRASHED', 'SYSTEM_FAILURE'].includes(run.status) &&
      prevStatusRef.current !== run.status
    ) {
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(error?.message || `Run ${run.status.toLowerCase()}`)
      }
    }

    prevStatusRef.current = run.status as RunStatus
  }, [run, error])

  // Build state object
  const isLoading =
    !run || ['PENDING', 'QUEUED', 'EXECUTING', 'WAITING'].includes(run?.status || '')
  const isComplete = run?.status === 'COMPLETED'
  const isError =
    !!tokenError ||
    !!error ||
    ['FAILED', 'CANCELED', 'TIMED_OUT', 'CRASHED', 'SYSTEM_FAILURE'].includes(run?.status || '')

  return {
    status: (run?.status as RunStatus) || 'PENDING',
    output: run?.output as T | undefined,
    error: tokenError || error?.message,
    metadata: run?.metadata as Record<string, unknown> | undefined,
    isLoading,
    isComplete,
    isError,
  }
}

/**
 * Simple polling fallback for when realtime isn't available
 * Uses adaptive polling - faster when active, slower when idle
 */
export function usePollingFallback<T = unknown>(
  runId: string | null,
  statusEndpoint: string,
  options: UseTriggerRealtimeOptions<T> = {}
): RealtimeRunState<T> {
  const [state, setState] = useState<RealtimeRunState<T>>({
    status: 'PENDING',
    isLoading: true,
    isComplete: false,
    isError: false,
  })

  const callbacksRef = useRef(options)
  callbacksRef.current = options

  useEffect(() => {
    if (!runId) return

    let timeoutId: NodeJS.Timeout
    let isActive = true
    let consecutiveErrors = 0

    const poll = async () => {
      if (!isActive) return

      try {
        const response = await fetch(`${statusEndpoint}?runId=${runId}`)

        if (response.status === 404) {
          // Run not found yet, keep polling with short interval
          if (isActive) {
            timeoutId = setTimeout(poll, 2000)
          }
          return
        }

        const data = await response.json()
        consecutiveErrors = 0

        const newState: RealtimeRunState<T> = {
          status: data.status as RunStatus,
          output: data.output,
          error: data.error,
          metadata: data.metadata,
          isLoading: ['PENDING', 'QUEUED', 'EXECUTING', 'WAITING'].includes(data.status),
          isComplete: data.status === 'COMPLETED',
          isError: ['FAILED', 'CANCELED', 'TIMED_OUT', 'CRASHED', 'SYSTEM_FAILURE'].includes(
            data.status
          ),
        }

        setState(newState)

        // Call callbacks
        if (newState.metadata && callbacksRef.current.onProgress) {
          callbacksRef.current.onProgress(newState.metadata)
        }

        if (newState.isComplete && newState.output && callbacksRef.current.onComplete) {
          callbacksRef.current.onComplete(newState.output)
          return // Stop polling on completion
        }

        if (newState.isError && callbacksRef.current.onError) {
          callbacksRef.current.onError(newState.error || 'Task failed')
          return // Stop polling on error
        }

        // Adaptive polling: faster when active, slower otherwise
        const nextInterval = newState.isLoading ? 3000 : 10000
        if (isActive) {
          timeoutId = setTimeout(poll, nextInterval)
        }
      } catch (error) {
        console.error('Polling error:', error)
        consecutiveErrors++

        // Back off on consecutive errors
        const backoffInterval = Math.min(consecutiveErrors * 5000, 30000)
        if (isActive) {
          timeoutId = setTimeout(poll, backoffInterval)
        }
      }
    }

    // Start polling
    poll()

    return () => {
      isActive = false
      clearTimeout(timeoutId)
    }
  }, [runId, statusEndpoint])

  return state
}
