import { Tile, useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { LocalStorageKeys, DynamicLocalStorageKeys } from '@/constants/localStorage'

interface FidelityRunState {
  runId: string
  tileId: string
  tileX: number
  tileY: number
  projectId: string
  startedAt: string
}

const ACTIVE_STATUSES = ['QUEUED', 'EXECUTING', 'WAITING', 'PENDING', 'DEQUEUED', 'DELAYED', 'PENDING_VERSION']

export class FidelityService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Enhance tile fidelity using Gemini with a style prompt
   */
  async enhance(tile: Tile, stylePrompt: string): Promise<string | null> {
    console.log('Starting fidelity enhancement via Trigger.dev for tile', tile.id)

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
          geminiConfig,
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
        if (!ACTIVE_STATUSES.includes(statusData.status)) {
          console.error('Fidelity enhancement failed:', statusData.error || statusData.status)
          this.clearRunState(runState, opId)
          return
        }
      } catch (error) {
        console.error('Status polling error:', error)
      }
    }, 3000) // Poll every 3 seconds

    this.pollingIntervals.set(runState.runId, pollInterval)
  }

  /**
   * Handle successful completion
   */
  private async handleCompletion(
    runState: FidelityRunState,
    output: { success: boolean; filename: string; imageUrl: string },
    opId: string
  ) {
    try {
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

