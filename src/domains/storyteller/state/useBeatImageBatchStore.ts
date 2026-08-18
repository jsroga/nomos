import { create } from 'zustand'

export interface BeatImagePatch {
  imageUrl?: string
  imagePrompt?: string
}

interface BeatImageBatchState {
  episodeId: string | null
  pendingBeatIds: string[]
  cancelled: boolean
  patches: Record<string, BeatImagePatch>
  start: (episodeId: string | null, beatIds: string[]) => void
  markDone: (beatId: string) => void
  applyPatch: (beatId: string, patch: BeatImagePatch) => void
  cancel: () => void
  clear: () => void
}

export const useBeatImageBatchStore = create<BeatImageBatchState>(set => ({
  episodeId: null,
  pendingBeatIds: [],
  cancelled: false,
  patches: {},
  start: (episodeId, beatIds) =>
    set({
      episodeId,
      pendingBeatIds: [...beatIds],
      cancelled: false,
    }),
  markDone: beatId =>
    set(state => ({
      pendingBeatIds: state.pendingBeatIds.filter(id => id !== beatId),
    })),
  applyPatch: (beatId, patch) =>
    set(state => ({
      patches: {
        ...state.patches,
        [beatId]: { ...state.patches[beatId], ...patch },
      },
    })),
  cancel: () => set({ cancelled: true }),
  clear: () =>
    set({
      episodeId: null,
      pendingBeatIds: [],
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
