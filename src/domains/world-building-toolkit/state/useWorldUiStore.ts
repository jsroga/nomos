import { create } from 'zustand'
import { JobStatus, JobType } from '@/shared/types/enums'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import {
  GlobalOperationStatus,
  WORLD_GEN_REPAINTING_LABEL,
  WorldGenOperationType,
  type MjGridPayload,
  type WorldGenReviewPayload,
} from '@/domains/world-building-toolkit/state/constants/world-ui-store'
import type { SelectResult } from './client-services/select-mode-service'
import { omitRecordKey } from './utils/omit-record-key'

export type SelectBox = { x1: number; y1: number; x2: number; y2: number }

export interface PendingUpscale {
  upscaledUrl: string
  originalUrl: string
  timestamp: number
}

export interface PendingGeneration {
  newUrl: string
  variantUrls?: string[]
  newBase64?: string
  originalUrl?: string
  isFirstTile: boolean
  timestamp: number
}

export interface PendingFidelity {
  newUrl: string
  newBase64?: string
  originalUrl: string
  timestamp: number
}

export interface WorldUiState {
  viewport: { x: number; y: number; scale: number }
  selectedTile: { x: number; y: number } | null
  selectedTiles: Array<{ x: number; y: number }>
  jobs: Record<string, { id: string; type: JobType; status: JobStatus; startTime: number; metadata?: unknown }>
  generatingTiles: Record<string, boolean>
  upscalingTiles: Record<string, boolean>
  repaintingTiles: Record<string, boolean>
  enhancingTiles: Record<string, boolean>
  failedTiles: Record<string, string>
  tileProgress: Record<string, { progress: number; stage: string }>
  isRepaintMode: boolean
  brushSize: number
  repaintStrokes: Array<{ x: number; y: number; radius?: number }>
  repaintResult: {
    imageUrl: string
    bounds: { x: number; y: number; width: number; height: number }
  } | null
  repaintPrompt: string
  debugInfo: { image: string; mask: string } | null
  generationDebugInfo: Record<string, unknown> | null
  isSelectMode: boolean
  selectBox: SelectBox | null
  isDrawingBox: boolean
  selectTextPrompt: string
  selectedMask: SelectResult | null
  isSegmenting: boolean
  selectDebugInfo: Record<string, unknown> | null
  previewAssetId: string | null
  showAllAssetMasks: boolean
  pendingUpscales: Record<string, PendingUpscale>
  pendingGenerations: Record<string, PendingGeneration>
  pendingFidelity: Record<string, PendingFidelity>
  setViewport: (viewport: { x: number; y: number; scale: number }) => void
  setSelectedTile: (tile: { x: number; y: number } | null) => void
  toggleTileSelection: (tile: { x: number; y: number }) => void
  clearSelection: () => void
  addJob: (id: string, type: JobType, metadata?: unknown) => void
  updateJobStatus: (id: string, status: JobStatus) => void
  removeJob: (id: string) => void
  addGeneratingTile: (x: number, y: number) => void
  removeGeneratingTile: (x: number, y: number) => void
  addUpscalingTile: (x: number, y: number) => void
  removeUpscalingTile: (x: number, y: number) => void
  addRepaintingTile: (x: number, y: number) => void
  removeRepaintingTile: (x: number, y: number) => void
  addEnhancingTile: (x: number, y: number) => void
  removeEnhancingTile: (x: number, y: number) => void
  setTileError: (x: number, y: number, message: string) => void
  clearTileError: (x: number, y: number) => void
  setTileProgress: (x: number, y: number, progress: number, stage: string) => void
  clearTileProgress: (x: number, y: number) => void
  setRepaintMode: (isRepaintMode: boolean) => void
  setBrushSize: (size: number) => void
  addRepaintStroke: (point: { x: number; y: number; radius?: number }) => void
  clearRepaintStrokes: () => void
  setRepaintResult: (
    result: {
      imageUrl: string
      bounds: { x: number; y: number; width: number; height: number }
    } | null
  ) => void
  setRepaintPrompt: (prompt: string) => void
  setDebugInfo: (info: { image: string; mask: string } | null) => void
  setGenerationDebugInfo: (info: Record<string, unknown> | null) => void
  setSelectMode: (isSelectMode: boolean) => void
  setSelectBox: (box: SelectBox | null) => void
  setDrawingBox: (isDrawing: boolean) => void
  setSelectTextPrompt: (prompt: string) => void
  clearSelectBox: () => void
  setSelectedMask: (mask: SelectResult | null) => void
  setSegmenting: (isSegmenting: boolean) => void
  setSelectDebugInfo: (info: Record<string, unknown> | null) => void
  setPreviewAssetId: (id: string | null) => void
  setShowAllAssetMasks: (show: boolean) => void
  setPendingUpscale: (x: number, y: number, upscaledUrl: string, originalUrl: string) => void
  rejectUpscale: (x: number, y: number) => void
  getPendingUpscale: (x: number, y: number) => PendingUpscale | undefined
  setPendingGeneration: (x: number, y: number, data: Omit<PendingGeneration, 'timestamp'>) => void
  rejectGeneration: (x: number, y: number) => void
  getPendingGeneration: (x: number, y: number) => PendingGeneration | undefined
  setPendingFidelity: (x: number, y: number, data: Omit<PendingFidelity, 'timestamp'>) => void
  rejectFidelity: (x: number, y: number) => void
  getPendingFidelity: (x: number, y: number) => PendingFidelity | undefined
  reviewRequestVersion: number
  pendingReviewRequest: WorldGenReviewPayload | null
  mjGridVersion: number
  pendingMjGrid: MjGridPayload | null
  enqueueReviewRequest: (payload: WorldGenReviewPayload) => void
  notifyMjGridReady: (payload: MjGridPayload) => void
}

export const useWorldUiStore = create<WorldUiState>((set, get) => ({
  viewport: { x: -256, y: -256, scale: 1 },
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
  brushSize: 50,
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

  setViewport: viewport => set({ viewport }),
  setSelectedTile: selectedTile =>
    set({ selectedTile, selectedTiles: selectedTile ? [selectedTile] : [] }),
  toggleTileSelection: tile => {
    const { selectedTiles } = get()
    const exists = selectedTiles.some(t => t.x === tile.x && t.y === tile.y)
    if (exists) {
      set({ selectedTiles: selectedTiles.filter(t => !(t.x === tile.x && t.y === tile.y)) })
    } else {
      set({ selectedTiles: [...selectedTiles, tile] })
    }
  },
  clearSelection: () => set({ selectedTiles: [], selectedTile: null }),

  addJob: (id, type, metadata) =>
    set(state => ({
      jobs: {
        ...state.jobs,
        [id]: { id, type, status: JobStatus.Pending, startTime: Date.now(), metadata },
      },
    })),
  updateJobStatus: (id, status) =>
    set(state => {
      if (!state.jobs[id]) return {}
      return { jobs: { ...state.jobs, [id]: { ...state.jobs[id], status } } }
    }),
  removeJob: id =>
    set(state => ({
      jobs: omitRecordKey(state.jobs, id),
    })),

  addGeneratingTile: (x, y) => {
    const key = `${x},${y}`
    set(state => ({
      generatingTiles: { ...state.generatingTiles, [key]: true },
      failedTiles: omitRecordKey(state.failedTiles, key),
    }))
  },
  removeGeneratingTile: (x, y) =>
    set(state => ({
      generatingTiles: omitRecordKey(state.generatingTiles, `${x},${y}`),
    })),
  addUpscalingTile: (x, y) => {
    const key = `${x},${y}`
    set(state => ({
      upscalingTiles: { ...state.upscalingTiles, [key]: true },
      failedTiles: omitRecordKey(state.failedTiles, key),
    }))
  },
  removeUpscalingTile: (x, y) =>
    set(state => ({
      upscalingTiles: omitRecordKey(state.upscalingTiles, `${x},${y}`),
    })),
  addRepaintingTile: (x, y) => {
    useGlobalStatusStore.getState().addOperation({
      id: `rep-${x},${y}`,
      type: WorldGenOperationType.WorldGen,
      label: WORLD_GEN_REPAINTING_LABEL,
      details: `(${x}, ${y})`,
      status: GlobalOperationStatus.InProgress,
    })
    const key = `${x},${y}`
    set(state => ({
      repaintingTiles: { ...state.repaintingTiles, [key]: true },
      failedTiles: omitRecordKey(state.failedTiles, key),
    }))
  },
  removeRepaintingTile: (x, y) => {
    useGlobalStatusStore.getState().removeOperation(`rep-${x},${y}`)
    set(state => ({
      repaintingTiles: omitRecordKey(state.repaintingTiles, `${x},${y}`),
    }))
  },
  addEnhancingTile: (x, y) => {
    const key = `${x},${y}`
    set(state => ({
      enhancingTiles: { ...state.enhancingTiles, [key]: true },
      failedTiles: omitRecordKey(state.failedTiles, key),
    }))
  },
  removeEnhancingTile: (x, y) =>
    set(state => ({
      enhancingTiles: omitRecordKey(state.enhancingTiles, `${x},${y}`),
    })),
  setTileError: (x, y, message) =>
    set(state => ({ failedTiles: { ...state.failedTiles, [`${x},${y}`]: message } })),
  clearTileError: (x, y) =>
    set(state => ({
      failedTiles: omitRecordKey(state.failedTiles, `${x},${y}`),
    })),
  setTileProgress: (x, y, progress, stage) =>
    set(state => ({
      tileProgress: { ...state.tileProgress, [`${x},${y}`]: { progress, stage } },
    })),
  clearTileProgress: (x, y) =>
    set(state => ({
      tileProgress: omitRecordKey(state.tileProgress, `${x},${y}`),
    })),

  setRepaintMode: isRepaintMode => set({ isRepaintMode }),
  setBrushSize: brushSize => set({ brushSize }),
  addRepaintStroke: point => set(state => ({ repaintStrokes: [...state.repaintStrokes, point] })),
  clearRepaintStrokes: () => set({ repaintStrokes: [] }),
  setRepaintResult: repaintResult => set({ repaintResult }),
  setRepaintPrompt: repaintPrompt => set({ repaintPrompt }),
  setDebugInfo: debugInfo => set({ debugInfo }),
  setGenerationDebugInfo: generationDebugInfo => set({ generationDebugInfo }),

  setSelectMode: isSelectMode => set({ isSelectMode }),
  setSelectBox: selectBox => set({ selectBox }),
  setDrawingBox: isDrawingBox => set({ isDrawingBox }),
  setSelectTextPrompt: selectTextPrompt => set({ selectTextPrompt }),
  clearSelectBox: () => set({ selectBox: null, selectedMask: null, selectDebugInfo: null }),
  setSelectedMask: selectedMask => set({ selectedMask }),
  setSegmenting: isSegmenting => set({ isSegmenting }),
  setSelectDebugInfo: selectDebugInfo => set({ selectDebugInfo }),

  setPreviewAssetId: previewAssetId => set({ previewAssetId }),
  setShowAllAssetMasks: showAllAssetMasks => set({ showAllAssetMasks }),

  setPendingUpscale: (x, y, upscaledUrl, originalUrl) =>
    set(state => ({
      pendingUpscales: {
        ...state.pendingUpscales,
        [`${x},${y}`]: { upscaledUrl, originalUrl, timestamp: Date.now() },
      },
    })),
  rejectUpscale: (x, y) =>
    set(state => ({
      pendingUpscales: omitRecordKey(state.pendingUpscales, `${x},${y}`),
    })),
  getPendingUpscale: (x, y) => get().pendingUpscales[`${x},${y}`],

  setPendingGeneration: (x, y, data) =>
    set(state => ({
      pendingGenerations: {
        ...state.pendingGenerations,
        [`${x},${y}`]: { ...data, timestamp: Date.now() },
      },
    })),
  rejectGeneration: (x, y) =>
    set(state => ({
      pendingGenerations: omitRecordKey(state.pendingGenerations, `${x},${y}`),
    })),
  getPendingGeneration: (x, y) => get().pendingGenerations[`${x},${y}`],

  setPendingFidelity: (x, y, data) =>
    set(state => ({
      pendingFidelity: {
        ...state.pendingFidelity,
        [`${x},${y}`]: { ...data, timestamp: Date.now() },
      },
    })),
  rejectFidelity: (x, y) =>
    set(state => ({
      pendingFidelity: omitRecordKey(state.pendingFidelity, `${x},${y}`),
    })),
  getPendingFidelity: (x, y) => get().pendingFidelity[`${x},${y}`],

  enqueueReviewRequest: payload =>
    set(state => ({
      pendingReviewRequest: payload,
      reviewRequestVersion: state.reviewRequestVersion + 1,
    })),
  notifyMjGridReady: payload =>
    set(state => ({
      pendingMjGrid: payload,
      mjGridVersion: state.mjGridVersion + 1,
    })),
}))

/** Imperative access for client services that cannot use React hooks. */
export function getWorldUiStore() {
  return useWorldUiStore.getState()
}
