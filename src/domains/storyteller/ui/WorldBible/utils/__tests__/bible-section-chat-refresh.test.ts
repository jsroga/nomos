import { describe, expect, it, vi, beforeEach } from 'vitest'
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
    getStorytellerUiStore().resetConsistencyFixRun()
    useWorkspaceChatUiStore.setState({ overlayOpen: false })
  })

  it('posts the soundtrack prompt on the active chat with the section pin', () => {
    const onSendMessage = vi.fn()
    expect(
      requestBibleSectionChatRefresh({
        onSendMessage,
        section: BibleSection.SOUNDTRACKS,
        promptId: StorytellerPromptRegistryId.BibleSoundtracksGenerate,
      })
    ).toBe(true)
    expect(useWorkspaceChatUiStore.getState().overlayOpen).toBe(true)
    expect(onSendMessage).toHaveBeenCalledWith(
      lookupPromptBody(StorytellerPromptRegistryId.BibleSoundtracksGenerate),
      BibleSection.SOUNDTRACKS
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
      })
    ).toBe(false)
  })
})
