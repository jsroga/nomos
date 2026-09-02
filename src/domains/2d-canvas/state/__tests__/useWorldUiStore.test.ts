import { beforeEach, describe, expect, it } from 'vitest'
import { useWorldUiStore } from '../useWorldUiStore'
import { JobStatus, JobType } from '@/shared/types/enums'
import { WorldGenReviewType } from '@/domains/2d-canvas/state/constants/world-ui-store'

describe('useWorldUiStore', () => {
  beforeEach(() => {
    useWorldUiStore.setState({
      viewport: { x: 0, y: 0, scale: 1 },
      selectedTile: null,
      selectedTiles: [],
      jobs: {},
      generatingTiles: {},
      upscalingTiles: {},
      repaintingTiles: {},
      enhancingTiles: {},
      failedTiles: {},
      tileProgress: {},
      isRepaintMode: false,
      brushSize: 40,
      repaintStrokes: [],
      repaintResult: null,
      repaintPrompt: '',
      debugInfo: null,
      generationDebugInfo: null,
      isSelectMode: false,
      selectBox: null,
      isDrawingBox: false,
      selectTextPrompt: '',
      selectedMask: null,
      isSegmenting: false,
      selectDebugInfo: null,
      previewAssetId: null,
      showAllAssetMasks: false,
      pendingUpscales: {},
      pendingGenerations: {},
      pendingFidelity: {},
      reviewRequestVersion: 0,
      pendingReviewRequest: null,
      mjGridVersion: 0,
      pendingMjGrid: null,
    })
  })

  describe('viewport actions', () => {
    it('sets viewport coordinates and scale', () => {
      useWorldUiStore.getState().setViewport({ x: 100, y: -200, scale: 1.5 })
      expect(useWorldUiStore.getState().viewport).toEqual({ x: 100, y: -200, scale: 1.5 })
    })
  })

  describe('selection actions', () => {
    it('sets single selected tile', () => {
      useWorldUiStore.getState().setSelectedTile({ x: 2, y: 3 })
      expect(useWorldUiStore.getState().selectedTile).toEqual({ x: 2, y: 3 })
      expect(useWorldUiStore.getState().selectedTiles).toEqual([{ x: 2, y: 3 }])
    })

    it('clears selected tile when set to null', () => {
      useWorldUiStore.getState().setSelectedTile({ x: 2, y: 3 })
      useWorldUiStore.getState().setSelectedTile(null)
      expect(useWorldUiStore.getState().selectedTile).toBeNull()
      expect(useWorldUiStore.getState().selectedTiles).toEqual([])
    })

    it('toggles tile selection for multi-selection', () => {
      useWorldUiStore.getState().toggleTileSelection({ x: 0, y: 0 })
      expect(useWorldUiStore.getState().selectedTiles).toEqual([{ x: 0, y: 0 }])

      useWorldUiStore.getState().toggleTileSelection({ x: 1, y: 0 })
      expect(useWorldUiStore.getState().selectedTiles).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ])

      // Toggling an existing tile removes it
      useWorldUiStore.getState().toggleTileSelection({ x: 0, y: 0 })
      expect(useWorldUiStore.getState().selectedTiles).toEqual([{ x: 1, y: 0 }])
    })

    it('clearSelection resets both selectedTile and selectedTiles', () => {
      useWorldUiStore.getState().setSelectedTile({ x: 5, y: 5 })
      useWorldUiStore.getState().clearSelection()
      expect(useWorldUiStore.getState().selectedTile).toBeNull()
      expect(useWorldUiStore.getState().selectedTiles).toEqual([])
    })
  })

  describe('job tracking actions', () => {
    it('adds, updates, and removes jobs', () => {
      useWorldUiStore.getState().addJob('job-1', JobType.Generate3D, { tileX: 0, tileY: 0 })
      const job = useWorldUiStore.getState().jobs['job-1']
      expect(job).toBeDefined()
      expect(job?.id).toBe('job-1')
      expect(job?.type).toBe(JobType.Generate3D)
      expect(job?.status).toBe(JobStatus.Pending)

      useWorldUiStore.getState().updateJobStatus('job-1', JobStatus.Completed)
      expect(useWorldUiStore.getState().jobs['job-1']?.status).toBe(JobStatus.Completed)

      useWorldUiStore.getState().removeJob('job-1')
      expect(useWorldUiStore.getState().jobs['job-1']).toBeUndefined()
    })
  })

  describe('tile state flags', () => {
    it('manages generating tiles', () => {
      useWorldUiStore.getState().addGeneratingTile(1, 2)
      expect(useWorldUiStore.getState().generatingTiles['1,2']).toBe(true)

      useWorldUiStore.getState().removeGeneratingTile(1, 2)
      expect(useWorldUiStore.getState().generatingTiles['1,2']).toBeUndefined()
    })

    it('manages upscaling tiles', () => {
      useWorldUiStore.getState().addUpscalingTile(3, 4)
      expect(useWorldUiStore.getState().upscalingTiles['3,4']).toBe(true)

      useWorldUiStore.getState().removeUpscalingTile(3, 4)
      expect(useWorldUiStore.getState().upscalingTiles['3,4']).toBeUndefined()
    })

    it('manages repainting tiles', () => {
      useWorldUiStore.getState().addRepaintingTile(5, 6)
      expect(useWorldUiStore.getState().repaintingTiles['5,6']).toBe(true)

      useWorldUiStore.getState().removeRepaintingTile(5, 6)
      expect(useWorldUiStore.getState().repaintingTiles['5,6']).toBeUndefined()
    })

    it('manages enhancing tiles', () => {
      useWorldUiStore.getState().addEnhancingTile(7, 8)
      expect(useWorldUiStore.getState().enhancingTiles['7,8']).toBe(true)

      useWorldUiStore.getState().removeEnhancingTile(7, 8)
      expect(useWorldUiStore.getState().enhancingTiles['7,8']).toBeUndefined()
    })

    it('manages tile errors', () => {
      useWorldUiStore.getState().setTileError(0, 0, 'Generation timeout')
      expect(useWorldUiStore.getState().failedTiles['0,0']).toBe('Generation timeout')

      useWorldUiStore.getState().clearTileError(0, 0)
      expect(useWorldUiStore.getState().failedTiles['0,0']).toBeUndefined()
    })

    it('manages tile progress and stages', () => {
      useWorldUiStore.getState().setTileProgress(2, 2, 50, 'submitting')
      expect(useWorldUiStore.getState().tileProgress['2,2']).toEqual({
        progress: 50,
        stage: 'submitting',
      })

      useWorldUiStore.getState().clearTileProgress(2, 2)
      expect(useWorldUiStore.getState().tileProgress['2,2']).toBeUndefined()
    })
  })

  describe('repaint mode and strokes', () => {
    it('updates repaint mode and brush size', () => {
      useWorldUiStore.getState().setRepaintMode(true)
      expect(useWorldUiStore.getState().isRepaintMode).toBe(true)

      useWorldUiStore.getState().setBrushSize(60)
      expect(useWorldUiStore.getState().brushSize).toBe(60)
    })

    it('adds and clears repaint strokes', () => {
      useWorldUiStore.getState().addRepaintStroke({ x: 10, y: 20, radius: 15 })
      useWorldUiStore.getState().addRepaintStroke({ x: 30, y: 40 })

      expect(useWorldUiStore.getState().repaintStrokes).toHaveLength(2)
      expect(useWorldUiStore.getState().repaintStrokes[0]).toEqual({ x: 10, y: 20, radius: 15 })

      useWorldUiStore.getState().clearRepaintStrokes()
      expect(useWorldUiStore.getState().repaintStrokes).toEqual([])
    })

    it('updates repaint prompt and debug info', () => {
      useWorldUiStore.getState().setRepaintPrompt('Add a cobblestone road')
      expect(useWorldUiStore.getState().repaintPrompt).toBe('Add a cobblestone road')

      useWorldUiStore.getState().setDebugInfo({ image: 'img.png', mask: 'mask.png' })
      expect(useWorldUiStore.getState().debugInfo).toEqual({ image: 'img.png', mask: 'mask.png' })
    })
  })

  describe('select mode actions', () => {
    it('sets select mode, select box, and drawing box', () => {
      useWorldUiStore.getState().setSelectMode(true)
      expect(useWorldUiStore.getState().isSelectMode).toBe(true)

      useWorldUiStore.getState().setSelectBox({ x1: 0, y1: 0, x2: 100, y2: 100 })
      expect(useWorldUiStore.getState().selectBox).toEqual({ x1: 0, y1: 0, x2: 100, y2: 100 })

      useWorldUiStore.getState().setDrawingBox(true)
      expect(useWorldUiStore.getState().isDrawingBox).toBe(true)

      useWorldUiStore.getState().clearSelectBox()
      expect(useWorldUiStore.getState().selectBox).toBeNull()
    })

    it('sets preview asset and show all masks', () => {
      useWorldUiStore.getState().setPreviewAssetId('asset-abc')
      expect(useWorldUiStore.getState().previewAssetId).toBe('asset-abc')

      useWorldUiStore.getState().setShowAllAssetMasks(true)
      expect(useWorldUiStore.getState().showAllAssetMasks).toBe(true)
    })
  })

  describe('pending queues (upscale, generation, fidelity)', () => {
    it('manages pending upscales', () => {
      useWorldUiStore.getState().setPendingUpscale(1, 1, 'https://cdn.example.com/up.png', 'https://cdn.example.com/orig.png')

      const pending = useWorldUiStore.getState().getPendingUpscale(1, 1)
      expect(pending).toBeDefined()
      expect(pending?.upscaledUrl).toBe('https://cdn.example.com/up.png')
      expect(pending?.originalUrl).toBe('https://cdn.example.com/orig.png')
      expect(pending?.timestamp).toBeGreaterThan(0)

      useWorldUiStore.getState().rejectUpscale(1, 1)
      expect(useWorldUiStore.getState().getPendingUpscale(1, 1)).toBeUndefined()
    })

    it('manages pending generations', () => {
      useWorldUiStore.getState().setPendingGeneration(2, 2, {
        newUrl: 'https://cdn.example.com/gen.png',
        variantUrls: ['https://cdn.example.com/v1.png', 'https://cdn.example.com/v2.png'],
        isFirstTile: true,
      })

      const pending = useWorldUiStore.getState().getPendingGeneration(2, 2)
      expect(pending).toBeDefined()
      expect(pending?.newUrl).toBe('https://cdn.example.com/gen.png')
      expect(pending?.variantUrls).toHaveLength(2)
      expect(pending?.isFirstTile).toBe(true)

      useWorldUiStore.getState().rejectGeneration(2, 2)
      expect(useWorldUiStore.getState().getPendingGeneration(2, 2)).toBeUndefined()
    })

    it('manages pending fidelity', () => {
      useWorldUiStore.getState().setPendingFidelity(3, 3, {
        newUrl: 'https://cdn.example.com/fid.png',
        originalUrl: 'https://cdn.example.com/fid-orig.png',
      })

      const pending = useWorldUiStore.getState().getPendingFidelity(3, 3)
      expect(pending).toBeDefined()
      expect(pending?.newUrl).toBe('https://cdn.example.com/fid.png')

      useWorldUiStore.getState().rejectFidelity(3, 3)
      expect(useWorldUiStore.getState().getPendingFidelity(3, 3)).toBeUndefined()
    })
  })

  describe('review and MJ grid notifications', () => {
    it('enqueueReviewRequest sets pending review request and increments version', () => {
      const initialVersion = useWorldUiStore.getState().reviewRequestVersion

      useWorldUiStore.getState().enqueueReviewRequest({
        type: WorldGenReviewType.Generation,
        tileX: 0,
        tileY: 0,
        newUrl: 'new.png',
      })

      expect(useWorldUiStore.getState().pendingReviewRequest).toEqual({
        type: WorldGenReviewType.Generation,
        tileX: 0,
        tileY: 0,
        newUrl: 'new.png',
      })
      expect(useWorldUiStore.getState().reviewRequestVersion).toBe(initialVersion + 1)
    })

    it('notifyMjGridReady sets pending MJ grid and increments version', () => {
      const initialVersion = useWorldUiStore.getState().mjGridVersion

      useWorldUiStore.getState().notifyMjGridReady({
        tileId: 'tile-1-1',
        tileX: 1,
        tileY: 1,
        gridImageUrl: 'grid.png',
        buttons: ['U1', 'U2'],
        taskId: 'task-123',
      })

      expect(useWorldUiStore.getState().pendingMjGrid).toEqual({
        tileId: 'tile-1-1',
        tileX: 1,
        tileY: 1,
        gridImageUrl: 'grid.png',
        buttons: ['U1', 'U2'],
        taskId: 'task-123',
      })
      expect(useWorldUiStore.getState().mjGridVersion).toBe(initialVersion + 1)
    })
  })
})
