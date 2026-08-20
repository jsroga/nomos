import { create } from 'zustand'

export interface BeatImagePatch {
  imageUrl?: string
  imagePrompt?: string
}

export enum BeatImageBatchOverlay {
  Generating = 'generating',
  Pending = 'pending',
}

interface BeatImageBatchState {
  episodeId: string | null
  pendingBeatIds: string[]
  activeBeatId: string | null
  activeRunId: string | null
  cancelled: boolean
  patches: Record<string, BeatImagePatch>
  start: (episodeId: string | null, beatIds: string[]) => void
  setActiveBeat: (beatId: string | null) => void
  setActiveRun: (runId: string | null) => void
  markDone: (beatId: string) => void
  applyPatch: (beatId: string, patch: BeatImagePatch) => void
  cancel: () => void
  clear: () => void
}

export const useBeatImageBatchStore = create<BeatImageBatchState>(set => ({
  episodeId: null,
  pendingBeatIds: [],
  activeBeatId: null,
  activeRunId: null,
  cancelled: false,
  patches: {},
  start: (episodeId, beatIds) =>
    set({
      episodeId,
      pendingBeatIds: [...beatIds],
      activeBeatId: null,
      activeRunId: null,
      cancelled: false,
    }),
  setActiveBeat: beatId => set({ activeBeatId: beatId }),
  setActiveRun: runId => set({ activeRunId: runId }),
  markDone: beatId =>
    set(state => ({
      pendingBeatIds: state.pendingBeatIds.filter(id => id !== beatId),
      activeBeatId: state.activeBeatId === beatId ? null : state.activeBeatId,
    })),
  applyPatch: (beatId, patch) =>
    set(state => {
      if (state.cancelled) return state
      return {
        patches: {
          ...state.patches,
          [beatId]: { ...state.patches[beatId], ...patch },
        },
      }
    }),
  cancel: () =>
    set({
      cancelled: true,
      pendingBeatIds: [],
      activeBeatId: null,
      activeRunId: null,
    }),
  clear: () =>
    set({
      episodeId: null,
      pendingBeatIds: [],
      activeBeatId: null,
      activeRunId: null,
      cancelled: false,
    }),
}))

export function getBeatImageBatchStore() {
  return useBeatImageBatchStore.getState()
}

export function isBeatImageBatchBusy(pendingBeatIds: readonly string[]): boolean {
  return pendingBeatIds.length > 0
}

export function applyBeatImagePatches<T extends { id: string }>(
  beats: readonly T[],
  patches: Record<string, BeatImagePatch>,
): T[] {
  return beats.map(beat => {
    const patch = patches[beat.id]
    return patch ? { ...beat, ...patch } : beat
  })
}

export function beatImageBatchOverlay(input: {
  beatId: string
  imageUrl?: string
  pendingBeatIds: readonly string[]
  activeBeatId: string | null
}): BeatImageBatchOverlay | null {
  if (!input.pendingBeatIds.includes(input.beatId)) return null
  if (input.activeBeatId === input.beatId || Boolean(input.imageUrl)) {
    return BeatImageBatchOverlay.Generating
  }
  return BeatImageBatchOverlay.Pending
}
