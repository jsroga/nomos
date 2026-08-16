import { create } from 'zustand'
import { StorytellerBibleTab } from '@/domains/storyteller/core/storyteller-page-wire'
import { StorytellerAgentId } from '@/domains/storyteller/ai/constants/agent-identity'
import {
  GenerationActivityPhase,
  isGenerationActivityBusy,
  type EntityNavigationPayload,
  type GenerationActivityState,
  type MoodboardCompletePayload,
  type PendingChatPromptPayload,
} from '@/domains/storyteller/state/constants/storyteller-ui-store'

enum GenerationActivityBootstrapLabel {
  SendingToWritersRoom = 'Sending to Writers Room…',
}

const IDLE_GENERATION_ACTIVITY: GenerationActivityState = {
  phase: GenerationActivityPhase.Idle,
  label: '',
  updatedAt: 0,
}

interface StorytellerUiState {
  entityNavigation: EntityNavigationPayload | null
  isWorldBibleOpen: boolean
  bibleTab: StorytellerBibleTab
  bibleTabRequest: StorytellerBibleTab | null
  moodboardComplete: MoodboardCompletePayload | null
  moodboardCompleteVersion: number
  moodboardPrimaryVersion: number
  pendingChatPrompt: PendingChatPromptPayload | null
  pendingChatPromptSeq: number
  generationActivity: GenerationActivityState
  pendingBoardHydration: boolean

  navigateToEntity: (payload: EntityNavigationPayload) => void
  clearEntityNavigation: () => void
  setWorldBibleOpen: (open: boolean) => void
  toggleWorldBible: () => void
  setBibleTab: (tab: StorytellerBibleTab) => void
  requestBibleTab: (tab: StorytellerBibleTab) => void
  clearBibleTabRequest: () => void
  notifyMoodboardComplete: (payload: MoodboardCompletePayload) => void
  notifyMoodboardPrimaryChanged: () => void
  requestChatPrompt: (message: string, section?: string) => void
  clearPendingChatPrompt: () => void
  setGenerationActivity: (patch: Partial<GenerationActivityState> & { phase: GenerationActivityPhase }) => void
  clearGenerationActivity: () => void
  setPendingBoardHydration: (pending: boolean) => void
}

let worldBibleSeeded = false

export const useStorytellerUiStore = create<StorytellerUiState>((set) => ({
  entityNavigation: null,
  isWorldBibleOpen: true,
  bibleTab: StorytellerBibleTab.Content,
  bibleTabRequest: null,
  moodboardComplete: null,
  moodboardCompleteVersion: 0,
  moodboardPrimaryVersion: 0,
  pendingChatPrompt: null,
  pendingChatPromptSeq: 0,
  generationActivity: IDLE_GENERATION_ACTIVITY,
  pendingBoardHydration: false,

  navigateToEntity: (payload) => set({ entityNavigation: payload }),
  clearEntityNavigation: () => set({ entityNavigation: null }),
  setWorldBibleOpen: (open) => {
    worldBibleSeeded = true
    set({ isWorldBibleOpen: open })
  },
  toggleWorldBible: () => {
    worldBibleSeeded = true
    set(state => ({ isWorldBibleOpen: !state.isWorldBibleOpen }))
  },
  setBibleTab: (tab) => set({ bibleTab: tab }),
  requestBibleTab: (tab) => set({ bibleTab: tab, bibleTabRequest: tab }),
  clearBibleTabRequest: () => set({ bibleTabRequest: null }),
  notifyMoodboardComplete: (payload) =>
    set((state) => ({
      moodboardComplete: payload,
      moodboardCompleteVersion: state.moodboardCompleteVersion + 1,
    })),
  notifyMoodboardPrimaryChanged: () =>
    set((state) => ({ moodboardPrimaryVersion: state.moodboardPrimaryVersion + 1 })),
  requestChatPrompt: (message, section) =>
    set((state) => {
      if (isGenerationActivityBusy(state.generationActivity.phase)) return state
      const id = state.pendingChatPromptSeq + 1
      return {
        pendingChatPromptSeq: id,
        pendingChatPrompt: { id, message, section },
        generationActivity: {
          phase: GenerationActivityPhase.Submitted,
          label: GenerationActivityBootstrapLabel.SendingToWritersRoom,
          section,
          agentId: StorytellerAgentId.Storyteller,
          updatedAt: Date.now(),
        },
      }
    }),
  clearPendingChatPrompt: () => set({ pendingChatPrompt: null }),
  setGenerationActivity: (patch) =>
    set((state) => ({
      generationActivity: {
        ...state.generationActivity,
        ...patch,
        updatedAt: Date.now(),
      },
    })),
  clearGenerationActivity: () => set({ generationActivity: IDLE_GENERATION_ACTIVITY }),
  setPendingBoardHydration: pending => set({ pendingBoardHydration: pending }),
}))

/** Imperative access for services that cannot use React hooks. */
export function getStorytellerUiStore() {
  return useStorytellerUiStore.getState()
}

/** First visit: bible open unless an episode is already in the URL. Later toggles win. */
export function seedWorldBibleOpen(hasEpisode: boolean) {
  if (worldBibleSeeded) return
  getStorytellerUiStore().setWorldBibleOpen(!hasEpisode)
}
