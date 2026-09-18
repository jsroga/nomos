import { describe, expect, it, beforeEach } from 'vitest'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import { lookupPromptBody } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-table'
import { GenerationActivityPhase } from '@/domains/storyteller/state/utils/storyteller-ui-store'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'
import {
  isBibleSectionRefreshDisabled,
  requestBibleSectionChatRefresh,
} from '../bible-section-chat-refresh'

describe('requestBibleSectionChatRefresh', () => {
  beforeEach(() => {
    getStorytellerUiStore().clearPendingChatPrompt()
    getStorytellerUiStore().clearGenerationActivity()
    getStorytellerUiStore().resetConsistencyFixRun()
    useWorkspaceChatUiStore.setState({
      overlayOpen: false,
      focusedSessionId: null,
      focusedSessionModuleId: null,
      mismatchDialog: null,
    })
  })

  it('posts the soundtrack prompt on the active chat with the section pin', () => {
    expect(
      requestBibleSectionChatRefresh({
        section: BibleSection.SOUNDTRACKS,
        promptId: StorytellerPromptRegistryId.BibleSoundtracksGenerate,
      })
    ).toBe(true)
    expect(useWorkspaceChatUiStore.getState().overlayOpen).toBe(true)
    expect(getStorytellerUiStore().pendingChatPrompt?.section).toBe(BibleSection.SOUNDTRACKS)
    expect(getStorytellerUiStore().pendingChatPrompt?.message).toBe(
      lookupPromptBody(StorytellerPromptRegistryId.BibleSoundtracksGenerate)
    )
  })

  it('still opens overlay and queues the prompt when onSendMessage is missing', () => {
    expect(
      requestBibleSectionChatRefresh({
        section: BibleSection.SOUNDTRACKS,
        promptId: StorytellerPromptRegistryId.BibleSoundtracksGenerate,
      })
    ).toBe(true)
    expect(useWorkspaceChatUiStore.getState().overlayOpen).toBe(true)
    expect(getStorytellerUiStore().pendingChatPrompt?.section).toBe(BibleSection.SOUNDTRACKS)
    expect(getStorytellerUiStore().pendingChatPrompt?.message).toBe(
      lookupPromptBody(StorytellerPromptRegistryId.BibleSoundtracksGenerate)
    )
  })

  it('refuses to queue while the Writers Room turn is already busy', () => {
    getStorytellerUiStore().setGenerationActivity({
      phase: GenerationActivityPhase.Streaming,
      label: 'Writers Room agent is thinking…',
    })
    expect(
      requestBibleSectionChatRefresh({
        section: BibleSection.WORLD_DESCRIPTION,
        promptId: StorytellerPromptRegistryId.WorldDescriptionRegen,
      })
    ).toBe(false)
    expect(getStorytellerUiStore().pendingChatPrompt).toBeNull()
  })
})

describe('isBibleSectionRefreshDisabled', () => {
  it('disables while a chat refresh is queued or the thread is busy', () => {
    expect(
      isBibleSectionRefreshDisabled({
        isLoading: false,
        generationPhase: GenerationActivityPhase.Idle,
        pendingChatPrompt: { id: 1, message: 'Regenerate soundtracks' },
      })
    ).toBe(true)
    expect(
      isBibleSectionRefreshDisabled({
        isLoading: false,
        generationPhase: GenerationActivityPhase.Streaming,
        pendingChatPrompt: null,
      })
    ).toBe(true)
    expect(
      isBibleSectionRefreshDisabled({
        isLoading: true,
        generationPhase: GenerationActivityPhase.Idle,
        pendingChatPrompt: null,
      })
    ).toBe(true)
    expect(
      isBibleSectionRefreshDisabled({
        isLoading: false,
        generationPhase: GenerationActivityPhase.Idle,
        pendingChatPrompt: null,
        overlayBusy: true,
      })
    ).toBe(true)
    expect(
      isBibleSectionRefreshDisabled({
        isLoading: false,
        generationPhase: GenerationActivityPhase.Idle,
        pendingChatPrompt: null,
      })
    ).toBe(false)
  })
})
