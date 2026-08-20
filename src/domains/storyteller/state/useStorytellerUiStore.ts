import { create } from 'zustand'
import { StorytellerBibleTab } from '@/domains/storyteller/core/storyteller-page-wire'
import { StorytellerAgentId } from '@/domains/storyteller/ai/constants/agent-identity'
import {
  CharacterDraftResolution,
  GenerationActivityPhase,
  isGenerationActivityBusy,
  type EntityNavigationPayload,
  type GenerationActivityState,
  type MoodboardCompletePayload,
  type PendingChatPromptPayload,
} from '@/domains/storyteller/state/constants/storyteller-ui-store'
import {
  ConsistencyFixRunPhase,
  isConsistencyFixRunBusy,
} from '@/domains/storyteller/ui/FixInconsistencies/constants/fix-inconsistencies-dialog'
import type { ConsistencyFixItem, ContinuityFinding } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-schema'
import type { SkippedFinding } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-contract'
import { mergePendingBeatArgs } from '@/domains/storyteller/state/utils/pending-beat-adds'
import type {
  CharacterFilledDraft,
  GeneratedCharacterFields,
} from '@/domains/storyteller/core/character-missing-fields'
import { CharacterDraftChatSection } from '@/domains/storyteller/core/storyteller-page-wire'

enum GenerationActivityBootstrapLabel {
  SendingToWritersRoom = 'Sending to Writers Room…',
  WaitingForWritersRoom = 'Waiting for Writers Room',
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
  characterDraftFields: GeneratedCharacterFields | null
  characterDraftFieldsSeq: number
  characterDraftResolvedSeq: number
  characterDraftResolution: CharacterDraftResolution
  characterDraftTargetId: string | null
  characterDraftFilledSnapshot: CharacterFilledDraft | null
  generationActivity: GenerationActivityState
  pendingBoardHydration: boolean
  pendingBeatAdds: Record<string, unknown>[]
  beatAddsCommitted: boolean
  isBibleEditing: boolean
  isEpisodeEditing: boolean
  consistencyFixRun: ConsistencyFixRunState

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
  beginCharacterDraft: (targetId: string, snapshot: CharacterFilledDraft) => void
  notifyCharacterDraftFields: (fields: GeneratedCharacterFields) => void
  acceptCharacterDraftFields: () => void
  rejectCharacterDraftFields: () => void
  clearCharacterDraft: () => void
  setGenerationActivity: (patch: Partial<GenerationActivityState> & { phase: GenerationActivityPhase }) => void
  clearGenerationActivity: () => void
  setPendingBoardHydration: (pending: boolean) => void
  appendPendingBeatAdds: (incoming: readonly Record<string, unknown>[]) => void
  clearPendingBeatAdds: (committed: boolean) => void
  setBibleEditing: (editing: boolean) => void
  setEpisodeEditing: (editing: boolean) => void
  setConsistencyFixRun: (patch: Partial<ConsistencyFixRunState>) => void
  resetConsistencyFixRun: () => void
}

export interface ConsistencyFixRunState {
  phase: ConsistencyFixRunPhase
  projectId: string | null
  runId: string | null
  stepId: string | null
  findings: ContinuityFinding[]
  fixes: ConsistencyFixItem[]
  skipped: SkippedFinding[]
  empty: boolean
  message: string
  error: string | null
  appliedCount: number
}

export const IDLE_CONSISTENCY_FIX_RUN: ConsistencyFixRunState = {
  phase: ConsistencyFixRunPhase.Idle,
  projectId: null,
  runId: null,
  stepId: null,
  findings: [],
  fixes: [],
  skipped: [],
  empty: false,
  message: '',
  error: null,
  appliedCount: 0,
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
  characterDraftFields: null,
  characterDraftFieldsSeq: 0,
  characterDraftResolvedSeq: 0,
  characterDraftResolution: CharacterDraftResolution.Idle,
  characterDraftTargetId: null,
  characterDraftFilledSnapshot: null,
  generationActivity: IDLE_GENERATION_ACTIVITY,
  pendingBoardHydration: false,
  pendingBeatAdds: [],
  beatAddsCommitted: false,
  isBibleEditing: false,
  isEpisodeEditing: false,
  consistencyFixRun: IDLE_CONSISTENCY_FIX_RUN,

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
      if (
        isGenerationActivityBusy(state.generationActivity.phase) ||
        isConsistencyFixRunBusy(state.consistencyFixRun.phase)
      ) {
        return state
      }
      const id = state.pendingChatPromptSeq + 1
      return {
        pendingChatPromptSeq: id,
        pendingChatPrompt: { id, message, section },
        generationActivity: {
          phase: GenerationActivityPhase.Submitted,
          label:
            section === CharacterDraftChatSection.Form
              ? GenerationActivityBootstrapLabel.WaitingForWritersRoom
              : GenerationActivityBootstrapLabel.SendingToWritersRoom,
          section,
          agentId: StorytellerAgentId.Storyteller,
          updatedAt: Date.now(),
        },
      }
    }),
  clearPendingChatPrompt: () => set({ pendingChatPrompt: null }),
  beginCharacterDraft: (targetId, snapshot) =>
    set({
      characterDraftTargetId: targetId,
      characterDraftFilledSnapshot: snapshot,
      characterDraftResolution: CharacterDraftResolution.Idle,
    }),
  notifyCharacterDraftFields: fields =>
    set(state => ({
      characterDraftFields: fields,
      characterDraftFieldsSeq: state.characterDraftFieldsSeq + 1,
      characterDraftResolution: CharacterDraftResolution.Idle,
    })),
  acceptCharacterDraftFields: () =>
    set(state => {
      if (state.characterDraftFieldsSeq <= state.characterDraftResolvedSeq) return state
      return {
        characterDraftResolvedSeq: state.characterDraftFieldsSeq,
        characterDraftResolution: CharacterDraftResolution.Accepted,
      }
    }),
  rejectCharacterDraftFields: () =>
    set(state => {
      if (state.characterDraftFieldsSeq <= state.characterDraftResolvedSeq && !state.characterDraftTargetId) {
        return state
      }
      return {
        characterDraftResolvedSeq: Math.max(
          state.characterDraftFieldsSeq,
          state.characterDraftResolvedSeq,
        ),
        characterDraftResolution: CharacterDraftResolution.Rejected,
        characterDraftTargetId: null,
        characterDraftFilledSnapshot: null,
        characterDraftFields: null,
      }
    }),
  clearCharacterDraft: () =>
    set(state => ({
      characterDraftResolvedSeq: Math.max(
        state.characterDraftFieldsSeq,
        state.characterDraftResolvedSeq,
      ),
      characterDraftResolution: CharacterDraftResolution.Idle,
      characterDraftTargetId: null,
      characterDraftFilledSnapshot: null,
      characterDraftFields: null,
    })),
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
  appendPendingBeatAdds: incoming =>
    set(state => ({
      pendingBeatAdds: mergePendingBeatArgs(state.pendingBeatAdds, incoming),
      beatAddsCommitted: false,
    })),
  clearPendingBeatAdds: committed => set({ pendingBeatAdds: [], beatAddsCommitted: committed }),
  setBibleEditing: editing => set({ isBibleEditing: editing }),
  setEpisodeEditing: editing => set({ isEpisodeEditing: editing }),
  setConsistencyFixRun: patch =>
    set(state => ({
      consistencyFixRun: { ...state.consistencyFixRun, ...patch },
    })),
  resetConsistencyFixRun: () => set({ consistencyFixRun: IDLE_CONSISTENCY_FIX_RUN }),
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
