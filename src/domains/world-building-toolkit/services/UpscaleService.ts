import { Tile, useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { LocalStorageKeys, DynamicLocalStorageKeys } from '@/constants/localStorage'
import { POLLING_INTERVALS, ACTIVE_TASK_STATUSES } from '@/constants/polling'

type UpscaleProvider = 'midjourney' | 'replicate' | 'stability'

interface UpscaleRunState {
  runId: string
  tileId: string
  tileX: number
  tileY: number
  projectId: string
  provider: UpscaleProvider
  startedAt: string
}

export class UpscaleService {
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
   * Start upscaling a tile using Trigger.dev background task
   */
  async upscale(
    tile: Tile,
    creativity: number,
    styleReferenceUrls?: string[]
  ): Promise<string | null> {
    console.log('Starting upscale via Trigger.dev for tile', tile.id, 'creativity', creativity, {
      styleReferenceUrls,
    })

    // Get configs from localStorage
    const geminiConfig = { apiKey: '', model: 'gemini-3-pro-image-preview' }
    let replicateConfig = { apiKey: '', model: '' }
    let stabilityConfig: { apiKey: string; upscaleMode?: 'conservative' | 'creative' } = {
      apiKey: '',
    }
    let legnextConfig = { apiKey: '' }
    let activeUpscaler: UpscaleProvider = 'stability'

    let skipGeminiPreUpscale = false

    if (typeof window !== 'undefined') {
      // Get Gemini config (optional for Step 1)
      const savedGemini = localStorage.getItem(LocalStorageKeys.AI_CONFIGS)
      if (savedGemini) {
        const configs = JSON.parse(savedGemini)
        if (configs.gemini?.apiKey) {
          geminiConfig.apiKey = configs.gemini.apiKey
        }
      }

      const savedReplicate = localStorage.getItem(LocalStorageKeys.AI_CONFIG_REPLICATE)
      if (savedReplicate) replicateConfig = JSON.parse(savedReplicate)

      const savedStability = localStorage.getItem(LocalStorageKeys.AI_CONFIG_STABILITY)
      if (savedStability) stabilityConfig = JSON.parse(savedStability)

      const savedLegNext = localStorage.getItem(LocalStorageKeys.AI_CONFIG_LEGNEXT)
      if (savedLegNext) legnextConfig = JSON.parse(savedLegNext)

      activeUpscaler =
        (localStorage.getItem(LocalStorageKeys.AI_ACTIVE_UPSCALER) as UpscaleProvider) ||
        'stability'

      // Check if Gemini pre-upscale should be skipped
      skipGeminiPreUpscale =
        localStorage.getItem(LocalStorageKeys.SKIP_GEMINI_PRE_UPSCALE) === 'true'
    }

    // Gemini is required for Step 1 unless skipped
    if (!skipGeminiPreUpscale && !geminiConfig.apiKey) {
      throw new Error(
        'Gemini API key is required for pre-upscaling. Configure it in Settings or disable Gemini pre-upscale.'
      )
    }

    // Get the provider config based on selection
    let providerConfig: { apiKey: string; model?: string; upscaleMode?: string; parameters?: any }

    switch (activeUpscaler) {
      case 'midjourney':
        if (!legnextConfig.apiKey) throw new Error('LegNext API key not found for Midjourney')
        providerConfig = {
          apiKey: legnextConfig.apiKey,
          parameters: (legnextConfig as any).parameters, // Pass specific MJ parameters
        }
        break
      case 'replicate':
        if (!replicateConfig.apiKey) throw new Error('Replicate API key not found')
        // Default to recraft-ai/recraft-creative-upscale if model not specified
        providerConfig = {
          apiKey: replicateConfig.apiKey,
          model: replicateConfig.model || 'recraft-ai/recraft-creative-upscale',
        }
        break
      case 'stability':
        if (!stabilityConfig.apiKey) throw new Error('Stability API key not found')
        providerConfig = {
          apiKey: stabilityConfig.apiKey,
          upscaleMode: stabilityConfig.upscaleMode || 'conservative',
        }
        break
      default:
        throw new Error(`Unknown upscaler: ${activeUpscaler}`)
    }

    // Track upscaling status
    useWorldStore.getState().addUpscalingTile(tile.x, tile.y)
    const opId = `upscale-${tile.x}-${tile.y}`
    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: 'world-gen',
      label: 'Upscaling Tile',
      details: `(${tile.x}, ${tile.y}) via ${activeUpscaler}`,
      status: 'in-progress',
    })

    try {
      // 1. Fetch the tile image and convert to base64
      const imageUrl = tile.image_filename.startsWith('http') ? tile.image_filename : `/projects/${tile.project_id}/${tile.image_filename}`
      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)
      const blob = await response.blob()

      const base64 = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => resolve((reader.result as string).split(',')[1])
        reader.readAsDataURL(blob)
      })

      // 2. Trigger the upscale task
      console.log(`Triggering upscale-tile task with provider: ${activeUpscaler}`)

      const triggerResponse = await fetch('/api/trigger-upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tileId: tile.id,
          projectId: tile.project_id,
          imageBase64: base64,
          prompt: tile.tile_prompt,
          creativity,
          provider: activeUpscaler,
          providerConfig,
          geminiConfig: skipGeminiPreUpscale ? undefined : geminiConfig,
          skipGeminiPreUpscale,
          // Pass style references if provided, otherwise API will fetch from project
          ...(styleReferenceUrls?.length ? { styleReferenceUrls } : {}),
        }),
      })

      const triggerData = await triggerResponse.json()

      if (!triggerResponse.ok || !triggerData.runId) {
        throw new Error(triggerData.error || 'Failed to trigger upscale task')
      }

      console.log('Upscale task triggered:', triggerData.runId)

      // 3. Save run state to localStorage for recovery
      const runState: UpscaleRunState = {
        runId: triggerData.runId,
        tileId: tile.id,
        tileX: tile.x,
        tileY: tile.y,
        projectId: tile.project_id,
        provider: activeUpscaler,
        startedAt: new Date().toISOString(),
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(DynamicLocalStorageKeys.upscaleRun(tile.id), JSON.stringify(runState))
      }

      // 4. Start polling for status
      this.startPolling(runState, opId)

      return triggerData.runId
    } catch (error) {
      console.error('Upscale error:', error)
      // Clean up status on error
      useWorldStore.getState().setTileError(tile.x, tile.y, error instanceof Error ? error.message : 'Upscale failed')
      useWorldStore.getState().removeUpscalingTile(tile.x, tile.y)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  /**
   * Start adaptive polling for task status
   * Uses shorter intervals during active processing, longer intervals when idle
   */
  private startPolling(runState: UpscaleRunState, opId: string) {
    let consecutiveErrors = 0
    let lastProgress = 0
    let stableProgressCount = 0

    const poll = async () => {
      try {
        const statusResponse = await fetch(`/api/trigger-upscale/status?runId=${runState.runId}`)
        const statusData = await statusResponse.json()

        if (statusResponse.status === 404) {
          consecutiveErrors++
          if (consecutiveErrors > 5) {
            console.warn('Upscale run not found after retries, clearing state')
            useWorldStore.getState().setTileError(runState.tileX, runState.tileY, 'Upscale task not found')
            this.clearRunState(runState, opId)
            return
          }
          this.scheduleNextPoll(runState.runId, poll, 2000)
          return
        }

        consecutiveErrors = 0
        const progress = statusData.metadata?.progress || 0
        const stage = statusData.metadata?.stage || 'unknown'

        // Track progress changes for adaptive polling
        if (progress === lastProgress) {
          stableProgressCount++
        } else {
          stableProgressCount = 0
          lastProgress = progress
        }

        // Update global status with progress
        useGlobalStatusStore.getState().updateOperation(opId, {
          details: `(${runState.tileX}, ${runState.tileY}) ${stage} ${progress}%`,
        })

        // Check if completed
        if (statusData.status === 'COMPLETED') {
          console.log('Upscale completed:', statusData.output)
          await this.handleCompletion(runState, statusData.output, opId)
          return
        }

        // Check if failed
        if (!ACTIVE_TASK_STATUSES.includes(statusData.status)) {
          const errorMsg = statusData.error || `Upscale failed (${statusData.status})`
          console.error('Upscale failed:', errorMsg)
          useWorldStore.getState().setTileError(runState.tileX, runState.tileY, errorMsg)
          this.clearRunState(runState, opId)
          return
        }

        // Adaptive polling interval
        let nextInterval = POLLING_INTERVALS.DEFAULT
        if (stableProgressCount === 0) {
          nextInterval = 2000
        } else if (stableProgressCount < 3) {
          nextInterval = POLLING_INTERVALS.DEFAULT
        } else {
          nextInterval = POLLING_INTERVALS.SLOW
        }

        this.scheduleNextPoll(runState.runId, poll, nextInterval)
      } catch (error) {
        console.error('Status polling error:', error)
        consecutiveErrors++
        const backoffInterval = Math.min(consecutiveErrors * 3000, 30000)
        this.scheduleNextPoll(runState.runId, poll, backoffInterval)
      }
    }

    poll()
  }

  /**
   * Schedule next poll with cleanup tracking
   */
  private scheduleNextPoll(runId: string, pollFn: () => Promise<void>, interval: number) {
    const existingTimeout = this.pollingIntervals.get(runId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    const timeoutId = setTimeout(pollFn, interval)
    this.pollingIntervals.set(runId, timeoutId)
  }

  /**
   * Handle successful completion
   */
  private async handleCompletion(runState: UpscaleRunState, output: any, opId: string) {
    try {
      // Check if upscale requires user review (new flow)
      if (output?.pendingReview && output?.upscaledUrl) {
        console.log('[UpscaleService] Upscale completed with Supabase URLs:', {
          upscaledUrl: output.upscaledUrl,
          originalUrl: output.originalUrl,
          filename: output.filename,
        })

        // Images are now stored in Supabase Storage - use URLs directly
        const upscaledUrl = output.upscaledUrl

        // For original, prefer the local existing tile (if any), otherwise use uploaded original
        const tiles = useWorldStore.getState().tiles
        const existingTile = tiles[`${runState.tileX},${runState.tileY}`]
        const originalUrl = existingTile?.image_filename
          ? (existingTile.image_filename.startsWith('http') ? existingTile.image_filename : `/projects/${runState.projectId}/${existingTile.image_filename}`)
          : output.originalUrl

        // Store pending upscale in store
        useWorldStore
          .getState()
          .setPendingUpscale(runState.tileX, runState.tileY, upscaledUrl, originalUrl)

        // Update global status to show review is needed
        useGlobalStatusStore.getState().updateOperation(opId, {
          status: 'completed',
          details: `(${runState.tileX}, ${runState.tileY}) - Review upscale`,
        })

        // Emit event for UI to show review dialog
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('upscale-review-ready', {
              detail: {
                tileX: runState.tileX,
                tileY: runState.tileY,
                upscaledUrl,
                originalUrl,
              },
            })
          )
        }

        this.clearRunState(runState, opId)
        return
      }

      // Check if MJ returned a grid requiring variant selection
      if (output?.requiresVariantSelection) {
        console.log('MJ grid received, storing for variant selection:', output)

        // Store the grid data for variant selection UI
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            DynamicLocalStorageKeys.mjGrid(runState.tileId),
            JSON.stringify({
              gridImageUrl: output.gridImageUrl,
              taskId: output.taskId,
              buttons: output.buttons,
              tileId: output.tileId,
              projectId: output.projectId,
              runState,
            })
          )
        }

        // Update global status to show variant selection is needed
        useGlobalStatusStore.getState().updateOperation(opId, {
          status: 'completed',
          details: `(${runState.tileX}, ${runState.tileY}) - Select variant`,
        })

        // Don't clear run state - keep it for variant selection
        // But stop polling
        const interval = this.pollingIntervals.get(runState.runId)
        if (interval) {
          clearInterval(interval)
          this.pollingIntervals.delete(runState.runId)
        }

        // Emit event for UI to show variant picker
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('mj-grid-ready', {
              detail: {
                tileId: runState.tileId,
                tileX: runState.tileX,
                tileY: runState.tileY,
                gridImageUrl: output.gridImageUrl,
                buttons: output.buttons,
                taskId: output.taskId,
              },
            })
          )
        }
        return
      }

      // Normal completion (non-MJ or variant selected) - LEGACY, shouldn't happen anymore
      if (output?.success && output?.filename) {
        // Update the store with the new filename
        const { tiles } = useWorldStore.getState()
        const tileKey = `${runState.tileX},${runState.tileY}`

        if (tiles[tileKey]) {
          useWorldStore.setState(state => ({
            tiles: {
              ...state.tiles,
              [tileKey]: { ...state.tiles[tileKey], image_filename: output.filename },
            },
          }))
        }

        console.log('Tile updated with upscaled image:', output.filename)
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
  private clearRunState(runState: UpscaleRunState, opId: string) {
    // Stop polling (now uses timeouts instead of intervals)
    const timeout = this.pollingIntervals.get(runState.runId)
    if (timeout) {
      clearTimeout(timeout)
      this.pollingIntervals.delete(runState.runId)
    }

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DynamicLocalStorageKeys.upscaleRun(runState.tileId))
    }

    // Clear UI status
    useWorldStore.getState().removeUpscalingTile(runState.tileX, runState.tileY)
    useGlobalStatusStore.getState().removeOperation(opId)
  }

  /**
   * Resume any pending upscale tasks from localStorage (call on app load)
   */
  resumePendingUpscales() {
    if (typeof window === 'undefined') return

    // Find all upscale run keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('upscale-run-')) {
        try {
          const runState: UpscaleRunState = JSON.parse(localStorage.getItem(key) || '')
          if (runState.runId) {
            console.log('Resuming upscale polling for:', runState.runId)

            // Re-add status indicators
            useWorldStore.getState().addUpscalingTile(runState.tileX, runState.tileY)
            const opId = `upscale-${runState.tileX}-${runState.tileY}`
            useGlobalStatusStore.getState().addOperation({
              id: opId,
              type: 'world-gen',
              label: 'Upscaling Tile (resumed)',
              details: `(${runState.tileX}, ${runState.tileY}) via ${runState.provider}`,
              status: 'in-progress',
            })

            // Start polling
            this.startPolling(runState, opId)
          }
        } catch (e) {
          console.warn('Failed to parse upscale run state:', key)
          localStorage.removeItem(key)
        }
      }
    }
  }

  /**
   * Stop an in-progress upscale
   */
  stopUpscale(tileId: string) {
    if (typeof window === 'undefined') return

    const key = `upscale-run-${tileId}`
    const data = localStorage.getItem(key)
    if (data) {
      try {
        const runState: UpscaleRunState = JSON.parse(data)
        const opId = `upscale-${runState.tileX}-${runState.tileY}`
        this.clearRunState(runState, opId)
        console.log('Stopped upscale for tile:', tileId)
      } catch (e) {
        localStorage.removeItem(key)
      }
    }
  }

  /**
   * Get pending MJ grid for a tile (if any)
   */
  getMjGrid(tileId: string): {
    gridImageUrl: string
    taskId: string
    buttons: any[]
    tileId: string
    projectId: string
    runState?: UpscaleRunState
  } | null {
    if (typeof window === 'undefined') return null

    const key = DynamicLocalStorageKeys.mjGrid(tileId)
    const data = localStorage.getItem(key)
    if (data) {
      try {
        return JSON.parse(data)
      } catch (e) {
        localStorage.removeItem(key)
      }
    }
    return null
  }

  /**
   * Select a variant from MJ grid - crops the grid and saves
   */
  async selectMjVariant(tileId: string, variantIndex: 1 | 2 | 3 | 4): Promise<string | null> {
    if (typeof window === 'undefined') return null

    const gridData = this.getMjGrid(tileId)
    if (!gridData) {
      throw new Error('No MJ grid data found for this tile')
    }

    console.log('Cropping variant', variantIndex, 'from:', gridData.gridImageUrl)

    const opId = `mj-variant-${gridData.runState?.tileX || 0}-${gridData.runState?.tileY || 0}`
    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: 'world-gen',
      label: 'Cropping MJ Variant',
      details: `Variant ${variantIndex}`,
      status: 'in-progress',
    })

    try {
      const response = await fetch('/api/trigger-upscale/select-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tileId,
          projectId: gridData.projectId,
          gridImageUrl: gridData.gridImageUrl,
          variantIndex,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.runId) {
        throw new Error(data.error || 'Failed to trigger variant selection')
      }

      console.log('Variant selection triggered:', data.runId)

      // Store run state
      const runState: UpscaleRunState = {
        runId: data.runId,
        tileId,
        tileX: gridData.runState?.tileX || 0,
        tileY: gridData.runState?.tileY || 0,
        projectId: gridData.projectId,
        provider: 'midjourney',
        startedAt: new Date().toISOString(),
      }
      localStorage.setItem(DynamicLocalStorageKeys.upscaleRun(tileId), JSON.stringify(runState))

      // Clear grid data
      localStorage.removeItem(DynamicLocalStorageKeys.mjGrid(tileId))

      // Start polling
      this.startPolling(runState, opId)

      return data.runId
    } catch (error) {
      console.error('Variant selection error:', error)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  /**
   * Clear MJ grid data without selecting (cancel)
   */
  clearMjGrid(tileId: string) {
    if (typeof window === 'undefined') return
    localStorage.removeItem(DynamicLocalStorageKeys.mjGrid(tileId))
    localStorage.removeItem(DynamicLocalStorageKeys.upscaleRun(tileId))
  }

  /**
   * Legacy resize helper (kept for compatibility)
   */
  private async resizeImage(
    base64Image: string,
    targetWidth: number,
    targetHeight: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
        const resized = canvas.toDataURL('image/png').split(',')[1]
        resolve(resized)
      }
      img.onerror = reject

      const imageData = base64Image.startsWith('data:')
        ? base64Image
        : `data:image/png;base64,${base64Image}`
      img.src = imageData
    })
  }
}

export const upscaleService = new UpscaleService()
