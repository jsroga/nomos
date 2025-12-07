/* eslint-disable @typescript-eslint/no-unused-vars */
import { Tile, useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { aiService } from '@/infrastructure/ai/service'
import { LocalStorageKeys, DynamicLocalStorageKeys } from '@/constants/localStorage'

interface TileGenRunState {
  runId: string
  projectId: string
  x: number
  y: number
  prompt: string
  startedAt: string
}

// Active status values that mean the task is still running
const ACTIVE_STATUSES = ['QUEUED', 'EXECUTING', 'WAITING', 'PENDING', 'DEQUEUED', 'DELAYED', 'PENDING_VERSION']

export class TileGenerationService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Generate a tile using Trigger.dev background task
   */
  async generate(
    projectId: string,
    x: number,
    y: number,
    prompt: string,
    styleReferenceUrls?: string[]
  ): Promise<string | null> {
    console.log(`Starting tile generation via Trigger.dev for (${x}, ${y})`, { styleReferenceUrls })

    // Get AI config from localStorage
    const aiProvider = aiService.getActiveModelId()
    let aiConfig = aiService.getConfig(aiProvider)

    // For Midjourney, also check cometConfig as fallback
    if (aiProvider === 'midjourney' && !aiConfig?.apiKey && typeof window !== 'undefined') {
      const savedComet = localStorage.getItem(LocalStorageKeys.AI_CONFIG_COMET)
      if (savedComet) {
        const cometConfig = JSON.parse(savedComet)
        if (cometConfig.apiKey) {
          aiConfig = { ...aiConfig, apiKey: cometConfig.apiKey }
        }
      }
    }

    if (!aiConfig?.apiKey) {
      throw new Error(`API key not found for provider: ${aiProvider}. Please configure it in Settings.`)
    }

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
      // Trigger the tile generation task
      console.log(`Triggering generate-tile task with provider: ${aiProvider}`)

      const triggerResponse = await fetch('/api/trigger-tile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          x,
          y,
          prompt,
          aiProvider,
          aiConfig,
          // Pass style references if provided, otherwise API will fetch from project
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
      useWorldStore.getState().removeGeneratingTile(x, y)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  /**
   * Start polling for task status
   */
  private startPolling(runState: TileGenRunState, opId: string) {
    const pollInterval = setInterval(async () => {
      try {
        const statusResponse = await fetch(`/api/trigger-tile/status?runId=${runState.runId}`)
        const statusData = await statusResponse.json()

        if (statusResponse.status === 404) {
          console.warn('Tile generation run not found, clearing state')
          this.clearRunState(runState, opId)
          return
        }

        const progress = statusData.metadata?.progress || 0
        const stage = statusData.metadata?.stage || 'unknown'

        // Update global status with progress
        useGlobalStatusStore.getState().updateOperation(opId, {
          details: `(${runState.x}, ${runState.y}) ${stage} ${progress}%`,
        })

        // Check if completed
        if (statusData.status === 'COMPLETED') {
          console.log('Tile generation completed:', statusData.output)
          await this.handleCompletion(runState, statusData.output, opId)
          return
        }

        // Check if failed
        if (!ACTIVE_STATUSES.includes(statusData.status)) {
          console.error('Tile generation failed:', statusData.error || statusData.status)
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
    runState: TileGenRunState,
    output: { success: boolean; filename: string; imageUrl: string },
    opId: string
  ) {
    try {
      if (output?.success && output?.filename) {
        // Update the store with the new tile
        const { tiles, currentProject } = useWorldStore.getState()
        const tileKey = `${runState.x},${runState.y}`

        // Create or update the tile in the store
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
    // Stop polling
    const interval = this.pollingIntervals.get(runState.runId)
    if (interval) {
      clearInterval(interval)
      this.pollingIntervals.delete(runState.runId)
    }

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DynamicLocalStorageKeys.tileGen(runState.x, runState.y))
    }

    // Clear UI status
    useWorldStore.getState().removeGeneratingTile(runState.x, runState.y)
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
}

export const tileGenerationService = new TileGenerationService()

