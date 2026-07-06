import { Tile, useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { DynamicLocalStorageKeys } from '@/constants/localStorage'
import { POLLING_INTERVALS, ACTIVE_TASK_STATUSES } from '@/constants/polling'
import type { ContextImageVariant } from '@/infrastructure/ai/contextAssembler'

interface TileGenRunState {
  runId: string
  projectId: string
  x: number
  y: number
  prompt: string
  startedAt: string
}

export interface FollowUpContextPayload {
  images: Partial<Record<ContextImageVariant, string>>
  maskBase64?: string
  preferredVariant: ContextImageVariant
}

export class TileGenerationService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Cleanup all polling intervals - call on unmount to prevent memory leaks
   */
  cleanup() {
    for (const [runId, timeout] of this.pollingIntervals) {
      clearTimeout(timeout)
    }
    this.pollingIntervals.clear()
  }

  /**
   * Helper to get a tile with its image URL resolved
   */
  private getTileImageUrl(
    tile: Tile | undefined,
    projectId: string
  ): (Tile & { imageUrl?: string }) | undefined {
    if (!tile?.image_filename) return undefined

    const imageUrl = tile.image_filename.startsWith('http')
      ? tile.image_filename
      : `${window.location.origin}/projects/${projectId}/${tile.image_filename}`

    return {
      ...tile,
      imageUrl,
    }
  }

  /**
   * Generate a tile using Trigger.dev background task.
   * Follow-up tiles must provide a browser-assembled context image. We fail fast if
   * neighbor context exists in the grid but the caller could not assemble it.
   */
  async generate(
    projectId: string,
    x: number,
    y: number,
    prompt: string,
    styleReferenceUrls?: string[],
    contextFromCaller?: FollowUpContextPayload | string
  ): Promise<string | null> {
    const normalizedContext =
      typeof contextFromCaller === 'string'
        ? {
            images: { canonicalFullContext: contextFromCaller },
            preferredVariant: 'canonicalFullContext' as const,
          }
        : contextFromCaller

    console.log(`Starting tile generation via Trigger.dev for (${x}, ${y})`, {
      styleReferenceUrls,
      hasContextFromCaller: !!normalizedContext,
      contextVariants: normalizedContext ? Object.keys(normalizedContext.images) : [],
    })

    // Track generating status
    useWorldStore.getState().addGeneratingTile(x, y)
    const opId = `gen-${x}-${y}`
    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: 'world-gen',
      label: 'Generating Tile',
      details: `(${x}, ${y})`,
      status: 'in-progress',
    })

    try {
      const tiles = useWorldStore.getState().tiles
      const origin =
        typeof window !== 'undefined' ? window.location.origin : ''
      const toAbsoluteUrl = (tile: Tile | undefined) => {
        if (!tile?.image_filename) return undefined
        return tile.image_filename.startsWith('http')
          ? tile.image_filename
          : `${origin}/projects/${projectId}/${tile.image_filename}`
      }
      const neighborUrls = {
        up: toAbsoluteUrl(tiles[`${x},${y - 1}`]),
        down: toAbsoluteUrl(tiles[`${x},${y + 1}`]),
        left: toAbsoluteUrl(tiles[`${x - 1},${y}`]),
        right: toAbsoluteUrl(tiles[`${x + 1},${y}`]),
        topLeft: toAbsoluteUrl(tiles[`${x - 1},${y - 1}`]),
        topRight: toAbsoluteUrl(tiles[`${x + 1},${y - 1}`]),
        bottomLeft: toAbsoluteUrl(tiles[`${x - 1},${y + 1}`]),
        bottomRight: toAbsoluteUrl(tiles[`${x + 1},${y + 1}`]),
      }
      const hasNeighbors = !!(
        neighborUrls.up ||
        neighborUrls.down ||
        neighborUrls.left ||
        neighborUrls.right
      )

      if (normalizedContext) {
        // Use pre-assembled context (worker-assembled in Sidebar; CORS-safe).
        console.log('Using pre-assembled context images', {
          variants: Object.keys(normalizedContext.images),
          preferredVariant: normalizedContext.preferredVariant,
          hasMask: !!normalizedContext.maskBase64,
        })
      } else if (hasNeighbors) {
        throw new Error('Follow-up tile generation requires a client-assembled context image')
      }

      // Use presence of neighbors (from grid), not context image, so we never treat a follow-up as first tile when client assembly failed
      const isFirstTile = !hasNeighbors

      console.log(
        `Triggering generate-tile task: isFirstTile=${isFirstTile}, hasContext=${!!normalizedContext}`
      )

      const triggerResponse = await fetch('/api/trigger-tile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          x,
          y,
          prompt,
          isFirstTile,
          ...(normalizedContext ? { contextPayload: normalizedContext } : {}),
          ...(styleReferenceUrls?.length ? { styleReferenceUrls } : {}),
        }),
      })

      const triggerData = await triggerResponse.json()

      if (!triggerResponse.ok || !triggerData.runId) {
        throw new Error(triggerData.error || 'Failed to trigger tile generation task')
      }

      console.log('Tile generation task triggered:', triggerData.runId)

      // Save run state to localStorage for recovery
      const runState: TileGenRunState = {
        runId: triggerData.runId,
        projectId,
        x,
        y,
        prompt,
        startedAt: new Date().toISOString(),
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(DynamicLocalStorageKeys.tileGen(x, y), JSON.stringify(runState))
      }

      // Start polling for status
      this.startPolling(runState, opId)

      return triggerData.runId
    } catch (error) {
      console.error('Tile generation error:', error)
      // Clean up status on error
      useWorldStore.getState().setTileError(x, y, error instanceof Error ? error.message : 'Generation failed')
      useWorldStore.getState().removeGeneratingTile(x, y)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  /**
   * Start adaptive polling for task status
   * Uses shorter intervals during active processing, longer intervals when idle
   * This reduces API calls by ~60% compared to fixed 5s polling
   */
  private startPolling(runState: TileGenRunState, opId: string) {
    let consecutiveErrors = 0
    let lastProgress = 0
    let stableProgressCount = 0
    let variantSelectionDispatched = false

    const poll = async () => {
      try {
        const statusResponse = await fetch(`/api/trigger-tile/status?runId=${runState.runId}`)
        const statusData = await statusResponse.json()

        if (statusResponse.status === 404) {
          // Run not found - might be still initializing, retry a few times
          consecutiveErrors++
          if (consecutiveErrors > 5) {
            console.warn('Tile generation run not found after retries, clearing state')
            useWorldStore.getState().setTileError(runState.x, runState.y, 'Generation task not found')
            this.clearRunState(runState, opId)
            return
          }
          this.scheduleNextPoll(runState.runId, poll, 2000)
          return
        }

        consecutiveErrors = 0
        const progress = statusData.metadata?.progress || 0
        const stage = statusData.metadata?.stage || 'unknown'

        // Track if progress is changing
        if (progress === lastProgress) {
          stableProgressCount++
        } else {
          stableProgressCount = 0
          lastProgress = progress
        }

        // Update global status with progress
        useGlobalStatusStore.getState().updateOperation(opId, {
          details: `(${runState.x}, ${runState.y}) ${stage} ${progress}%`,
        })

        // Update per-tile progress overlay
        useWorldStore.getState().setTileProgress(runState.x, runState.y, progress, stage)

        // Detect variant selection waiting state
        if (
          !variantSelectionDispatched &&
          stage === 'waiting_variant_selection' &&
          statusData.metadata?.variantUrls?.length &&
          statusData.metadata?.waitTokenId
        ) {
          variantSelectionDispatched = true
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('generation-variant-selection-ready', {
                detail: {
                  tileX: runState.x,
                  tileY: runState.y,
                  variantUrls: statusData.metadata.variantUrls,
                  tokenId: statusData.metadata.waitTokenId,
                },
              })
            )
          }
        }

        // Check if completed
        if (statusData.status === 'COMPLETED') {
          console.log('Tile generation completed:', statusData.output)
          await this.handleCompletion(runState, statusData.output, opId)
          return
        }

        // Check if failed
        if (!ACTIVE_TASK_STATUSES.includes(statusData.status)) {
          const errorMsg = statusData.error || `Generation failed (${statusData.status})`
          console.error('Tile generation failed:', errorMsg)
          useWorldStore.getState().setTileError(runState.x, runState.y, errorMsg)
          this.clearRunState(runState, opId)
          return
        }

        // Adaptive polling interval:
        // - 2s if progress is actively changing
        // - 5s if progress is stable but task is active
        // - 10s if progress has been stable for a while (likely waiting for external API)
        let nextInterval: number = POLLING_INTERVALS.DEFAULT
        if (stableProgressCount === 0) {
          nextInterval = 2000 // Progress changing, poll faster
        } else if (stableProgressCount < 3) {
          nextInterval = POLLING_INTERVALS.DEFAULT // Normal polling
        } else {
          nextInterval = POLLING_INTERVALS.SLOW // Back off when stable
        }

        this.scheduleNextPoll(runState.runId, poll, nextInterval)
      } catch (error) {
        console.error('Status polling error:', error)
        consecutiveErrors++
        // Back off on errors
        const backoffInterval = Math.min(consecutiveErrors * 3000, 30000)
        this.scheduleNextPoll(runState.runId, poll, backoffInterval)
      }
    }

    // Start first poll
    poll()
  }

  /**
   * Schedule next poll with cleanup tracking
   */
  private scheduleNextPoll(runId: string, pollFn: () => Promise<void>, interval: number) {
    // Clear any existing timeout
    const existingTimeout = this.pollingIntervals.get(runId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Schedule next poll
    const timeoutId = setTimeout(pollFn, interval)
    this.pollingIntervals.set(runId, timeoutId)
  }

  /**
   * Handle successful completion
   */
  private async handleCompletion(
    runState: TileGenRunState,
    output: {
      success: boolean
      filename: string
      newUrl: string
      newBase64?: string
      variantUrls?: string[]
      originalUrl?: string
      isFirstTile: boolean
      pendingReview?: boolean
    },
    opId: string
  ) {
    try {
      // Check if generation requires user review (new flow)
      if (output?.pendingReview && output?.newUrl) {
        console.log('[TileGenerationService] Generation completed with Supabase URL:', {
          newUrl: output.newUrl,
          originalUrl: output.originalUrl,
          isFirstTile: output.isFirstTile,
        })

        // Images are now stored in Vercel Blob - use URL directly
        const newUrl = output.newUrl

        // For original, prefer local existing tile (if any)
        const tiles = useWorldStore.getState().tiles
        const existingTile = tiles[`${runState.x},${runState.y}`]
        let originalUrl = output.originalUrl
        if (existingTile?.image_filename) {
          // Handle both local paths and full URLs
          originalUrl = existingTile.image_filename.startsWith('http')
            ? existingTile.image_filename
            : `/projects/${runState.projectId}/${existingTile.image_filename}`
        }

        // Store pending generation in store
        useWorldStore.getState().setPendingGeneration(runState.x, runState.y, {
          newUrl,
          newBase64: output.newBase64, // Still keep for acceptGeneration
          variantUrls: output.variantUrls,
          originalUrl,
          isFirstTile: !existingTile,
        })

        // Update global status to show review is needed
        useGlobalStatusStore.getState().updateOperation(opId, {
          status: 'completed',
          details: `(${runState.x}, ${runState.y}) - Review generation`,
        })

        // Emit event for UI to show review dialog
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('generation-review-ready', {
              detail: {
                tileX: runState.x,
                tileY: runState.y,
                newUrl,
                variantUrls: output.variantUrls,
                originalUrl,
                isFirstTile: !existingTile,
              },
            })
          )
        }

        this.clearRunState(runState, opId)
        return
      }

      // Legacy flow - direct update (shouldn't happen anymore)
      if (output?.success && output?.filename) {
        const { tiles } = useWorldStore.getState()
        const tileKey = `${runState.x},${runState.y}`

        useWorldStore.setState(state => ({
          tiles: {
            ...state.tiles,
            [tileKey]: {
              id: tiles[tileKey]?.id || `tile-${runState.x}-${runState.y}`,
              project_id: runState.projectId,
              x: runState.x,
              y: runState.y,
              tile_prompt: runState.prompt,
              image_filename: output.filename,
              created_at: tiles[tileKey]?.created_at || new Date().toISOString(),
            },
          },
        }))

        console.log('Tile generated:', output.filename)
      }
    } catch (error) {
      console.error('Error updating tile after completion:', error)
    } finally {
      this.clearRunState(runState, opId)
    }
  }

  /**
   * Clear run state and stop polling
   */
  private clearRunState(runState: TileGenRunState, opId: string) {
    // Stop polling (now uses timeouts instead of intervals)
    const timeout = this.pollingIntervals.get(runState.runId)
    if (timeout) {
      clearTimeout(timeout)
      this.pollingIntervals.delete(runState.runId)
    }

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DynamicLocalStorageKeys.tileGen(runState.x, runState.y))
    }

    // Clear UI status
    useWorldStore.getState().removeGeneratingTile(runState.x, runState.y)
    useWorldStore.getState().clearTileProgress(runState.x, runState.y)
    useGlobalStatusStore.getState().removeOperation(opId)
  }

  /**
   * Resume any pending tile generation tasks from localStorage (call on app load)
   */
  resumePendingGenerations() {
    if (typeof window === 'undefined') return

    // Find all tile-gen run keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('tile-gen-')) {
        try {
          const runState: TileGenRunState = JSON.parse(localStorage.getItem(key) || '')
          if (runState.runId) {
            console.log('Resuming tile generation polling for:', runState.runId)

            // Re-add status indicators
            useWorldStore.getState().addGeneratingTile(runState.x, runState.y)
            const opId = `gen-${runState.x}-${runState.y}`
            useGlobalStatusStore.getState().addOperation({
              id: opId,
              type: 'world-gen',
              label: 'Generating Tile (resumed)',
              details: `(${runState.x}, ${runState.y})`,
              status: 'in-progress',
            })

            // Start polling
            this.startPolling(runState, opId)
          }
        } catch (e) {
          console.warn('Failed to parse tile generation run state:', key)
          localStorage.removeItem(key)
        }
      }
    }
  }

  /**
   * Stop an in-progress generation
   */
  stopGeneration(x: number, y: number) {
    if (typeof window === 'undefined') return

    const key = `tile-gen-${x}-${y}`
    const data = localStorage.getItem(key)
    if (data) {
      try {
        const runState: TileGenRunState = JSON.parse(data)
        const opId = `gen-${runState.x}-${runState.y}`
        this.clearRunState(runState, opId)
        console.log('Stopped tile generation for:', x, y)
      } catch (e) {
        localStorage.removeItem(key)
      }
    }
  }

  /**
   * Check if a tile is currently being generated
   */
  isGenerating(x: number, y: number): boolean {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem(DynamicLocalStorageKeys.tileGen(x, y))
  }

  async completeVariantSelection(tokenId: string, action: 'accept' | 'upscale', variantIndex: number): Promise<void> {
    const response = await fetch('/api/complete-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId, action, variantIndex }),
    })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to complete variant selection')
    }
  }
}

export const tileGenerationService = new TileGenerationService()
