import { Tile, useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { LocalStorageKeys, DynamicLocalStorageKeys } from '@/constants/localStorage'
import { POLLING_INTERVALS, ACTIVE_TASK_STATUSES } from '@/constants/polling'

interface FidelityRunState {
  runId: string
  tileId: string
  tileX: number
  tileY: number
  projectId: string
  startedAt: string
}

export class FidelityService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Enhance tile fidelity using Gemini with a style prompt
   */
  async enhance(tile: Tile, stylePrompt: string, creativity: number, styleReferenceUrls?: string[]): Promise<string | null> {
    console.log('Starting fidelity enhancement via Trigger.dev for tile', tile.id, { creativity, styleReferenceUrls })

    // Get Gemini config from localStorage
    let geminiConfig = { apiKey: '', model: 'gemini-3-pro-image-preview' }

    if (typeof window !== 'undefined') {
      const savedGemini = localStorage.getItem(LocalStorageKeys.AI_CONFIGS)
      if (savedGemini) {
        const configs = JSON.parse(savedGemini)
        if (configs.gemini?.apiKey) {
          geminiConfig.apiKey = configs.gemini.apiKey
        }
      }
    }

    if (!geminiConfig.apiKey) {
      throw new Error('Gemini API key is required for fidelity enhancement. Configure it in Settings.')
    }

    // Track enhancing status
    useWorldStore.getState().addEnhancingTile(tile.x, tile.y)
    const opId = `fidelity-${tile.x}-${tile.y}`
    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: 'world-gen',
      label: 'Enhancing Fidelity',
      details: `(${tile.x}, ${tile.y})`,
      status: 'in-progress',
    })

    try {
      // 1. Fetch the tile image and convert to base64
      const imageUrl = `/projects/${tile.project_id}/${tile.image_filename}`
      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)
      const blob = await response.blob()

      const base64 = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => resolve((reader.result as string).split(',')[1])
        reader.readAsDataURL(blob)
      })

      // 2. Trigger the fidelity enhancement task
      console.log('Triggering enhance-fidelity task')

      const triggerResponse = await fetch('/api/trigger-fidelity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tileId: tile.id,
          projectId: tile.project_id,
          imageBase64: base64,
          stylePrompt,
          creativity,
          geminiConfig,
          // Pass style references if provided, otherwise API will fetch from project
          ...(styleReferenceUrls?.length ? { styleReferenceUrls } : {}),
        }),
      })

      const triggerData = await triggerResponse.json()

      if (!triggerResponse.ok || !triggerData.runId) {
        throw new Error(triggerData.error || 'Failed to trigger fidelity enhancement task')
      }

      console.log('Fidelity enhancement task triggered:', triggerData.runId)

      // 3. Save run state to localStorage for recovery
      const runState: FidelityRunState = {
        runId: triggerData.runId,
        tileId: tile.id,
        tileX: tile.x,
        tileY: tile.y,
        projectId: tile.project_id,
        startedAt: new Date().toISOString(),
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(DynamicLocalStorageKeys.fidelityRun(tile.id), JSON.stringify(runState))
      }

      // 4. Start polling for status
      this.startPolling(runState, opId)

      return triggerData.runId
    } catch (error) {
      console.error('Fidelity enhancement error:', error)
      // Clean up status on error
      useWorldStore.getState().removeEnhancingTile(tile.x, tile.y)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  /**
   * Start polling for task status
   */
  private startPolling(runState: FidelityRunState, opId: string) {
    const pollInterval = setInterval(async () => {
      try {
        const statusResponse = await fetch(`/api/trigger-fidelity/status?runId=${runState.runId}`)
        const statusData = await statusResponse.json()

        console.log('Fidelity poll response:', {
          status: statusData.status,
          metadata: statusData.metadata,
          error: statusData.error,
        })

        if (statusResponse.status === 404) {
          console.warn('Fidelity run not found, clearing state')
          this.clearRunState(runState, opId)
          return
        }

        const progress = statusData.metadata?.progress || 0
        const stage = statusData.metadata?.stage || 'unknown'

        // Update global status with progress
        useGlobalStatusStore.getState().updateOperation(opId, {
          details: `(${runState.tileX}, ${runState.tileY}) ${stage} ${progress}%`,
        })

        // Check if completed
        if (statusData.status === 'COMPLETED') {
          console.log('Fidelity enhancement completed:', statusData.output)
          await this.handleCompletion(runState, statusData.output, opId)
          return
        }

        // Check if failed
        if (!ACTIVE_TASK_STATUSES.includes(statusData.status)) {
          console.error('Fidelity enhancement failed:', statusData.error || statusData.status)
          this.clearRunState(runState, opId)
          return
        }
      } catch (error) {
        console.error('Status polling error:', error)
      }
    }, POLLING_INTERVALS.DEFAULT) // Poll every 5 seconds

    this.pollingIntervals.set(runState.runId, pollInterval)
  }

  /**
   * Handle successful completion
   */
  private async handleCompletion(
    runState: FidelityRunState,
    output: { success: boolean; filename: string; enhancedUrl: string; enhancedBase64: string; originalUrl: string; pendingReview?: boolean },
    opId: string
  ) {
    try {
      // Check if fidelity enhancement requires user review (new flow)
      if (output?.pendingReview && output?.enhancedUrl) {
        console.log('[FidelityService] Enhancement completed with Supabase URL:', {
          enhancedUrl: output.enhancedUrl,
          originalUrl: output.originalUrl,
        })

        // Images are now stored in Supabase Storage - use URL directly
        const enhancedUrl = output.enhancedUrl
        
        // For original, prefer local existing tile (if any)
        const tiles = useWorldStore.getState().tiles
        const existingTile = tiles[`${runState.tileX},${runState.tileY}`]
        const originalUrl = existingTile?.image_filename 
          ? `/projects/${runState.projectId}/${existingTile.image_filename}`
          : output.originalUrl || ''

        // Store pending fidelity in store
        useWorldStore.getState().setPendingFidelity(
          runState.tileX,
          runState.tileY,
          {
            newUrl: enhancedUrl,
            newBase64: output.enhancedBase64, // Still keep for acceptFidelity
            originalUrl,
          }
        )

        // Update global status to show review is needed
        useGlobalStatusStore.getState().updateOperation(opId, {
          status: 'completed',
          details: `(${runState.tileX}, ${runState.tileY}) - Review enhancement`,
        })

        // Emit event for UI to show review dialog
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fidelity-review-ready', {
            detail: {
              tileX: runState.tileX,
              tileY: runState.tileY,
              newUrl: enhancedUrl,
              originalUrl,
            }
          }))
        }

        this.clearRunState(runState, opId)
        return
      }

      // Legacy flow - direct update (shouldn't happen anymore)
      if (output?.success && output?.filename) {
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

        console.log('Tile updated with enhanced image:', output.filename)
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
  private clearRunState(runState: FidelityRunState, opId: string) {
    // Stop polling
    const interval = this.pollingIntervals.get(runState.runId)
    if (interval) {
      clearInterval(interval)
      this.pollingIntervals.delete(runState.runId)
    }

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DynamicLocalStorageKeys.fidelityRun(runState.tileId))
    }

    // Clear UI status
    useWorldStore.getState().removeEnhancingTile(runState.tileX, runState.tileY)
    useGlobalStatusStore.getState().removeOperation(opId)
  }

  /**
   * Resume any pending fidelity enhancement tasks from localStorage (call on app load)
   */
  resumePendingEnhancements() {
    if (typeof window === 'undefined') return

    // Find all fidelity run keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('fidelity-run-')) {
        try {
          const runState: FidelityRunState = JSON.parse(localStorage.getItem(key) || '')
          if (runState.runId) {
            console.log('Resuming fidelity enhancement polling for:', runState.runId)

            // Re-add status indicators
            useWorldStore.getState().addEnhancingTile(runState.tileX, runState.tileY)
            const opId = `fidelity-${runState.tileX}-${runState.tileY}`
            useGlobalStatusStore.getState().addOperation({
              id: opId,
              type: 'world-gen',
              label: 'Enhancing Fidelity (resumed)',
              details: `(${runState.tileX}, ${runState.tileY})`,
              status: 'in-progress',
            })

            // Start polling
            this.startPolling(runState, opId)
          }
        } catch (e) {
          console.warn('Failed to parse fidelity run state:', key)
          localStorage.removeItem(key)
        }
      }
    }
  }

  /**
   * Stop an in-progress fidelity enhancement
   */
  stopEnhancement(tileId: string) {
    if (typeof window === 'undefined') return

    const key = DynamicLocalStorageKeys.fidelityRun(tileId)
    const data = localStorage.getItem(key)
    if (data) {
      try {
        const runState: FidelityRunState = JSON.parse(data)
        const opId = `fidelity-${runState.tileX}-${runState.tileY}`
        this.clearRunState(runState, opId)
        console.log('Stopped fidelity enhancement for tile:', tileId)
      } catch (e) {
        localStorage.removeItem(key)
      }
    }
  }
}

export const fidelityService = new FidelityService()

