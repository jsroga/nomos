import { create } from 'zustand'
import { StorytellerBibleTab } from '@/domains/storyteller/core/storyteller-page-wire'
import type {
  EntityNavigationPayload,
  MoodboardCompletePayload,
} from '@/domains/storyteller/state/constants/storyteller-ui-store'

interface StorytellerUiState {
  entityNavigation: EntityNavigationPayload | null
  bibleTabRequest: StorytellerBibleTab | null
  moodboardComplete: MoodboardCompletePayload | null
  moodboardCompleteVersion: number
  moodboardPrimaryVersion: number

  navigateToEntity: (payload: EntityNavigationPayload) => void
  clearEntityNavigation: () => void
  requestBibleTab: (tab: StorytellerBibleTab) => void
  clearBibleTabRequest: () => void
  notifyMoodboardComplete: (payload: MoodboardCompletePayload) => void
  notifyMoodboardPrimaryChanged: () => void
}

export const useStorytellerUiStore = create<StorytellerUiState>((set) => ({
  entityNavigation: null,
  bibleTabRequest: null,
  moodboardComplete: null,
  moodboardCompleteVersion: 0,
  moodboardPrimaryVersion: 0,

  navigateToEntity: (payload) => set({ entityNavigation: payload }),
  clearEntityNavigation: () => set({ entityNavigation: null }),
  requestBibleTab: (tab) => set({ bibleTabRequest: tab }),
  clearBibleTabRequest: () => set({ bibleTabRequest: null }),
  notifyMoodboardComplete: (payload) =>
    set((state) => ({
      moodboardComplete: payload,
      moodboardCompleteVersion: state.moodboardCompleteVersion + 1,
    })),
  notifyMoodboardPrimaryChanged: () =>
    set((state) => ({ moodboardPrimaryVersion: state.moodboardPrimaryVersion + 1 })),
}))

/** Imperative access for services that cannot use React hooks. */
export function getStorytellerUiStore() {
  return useStorytellerUiStore.getState()
}
