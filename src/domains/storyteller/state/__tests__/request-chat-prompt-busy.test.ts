import { describe, expect, it, beforeEach } from 'vitest'
import { getStorytellerUiStore } from '../useStorytellerUiStore'
import { GenerationActivityPhase } from '@/domains/storyteller/state/utils/storyteller-ui-store'
import { ConsistencyFixRunPhase } from '@/domains/storyteller/ui/FixInconsistencies/utils/fix-inconsistencies-dialog'
import { BibleSection } from '@/domains/storyteller/core/types/enums'

describe('requestChatPrompt', () => {
  beforeEach(() => {
    const store = getStorytellerUiStore()
    store.clearPendingChatPrompt()
    store.clearGenerationActivity()
    store.resetConsistencyFixRun()
  })

  it('does not queue a prompt while generationActivity is busy', () => {
    const store = getStorytellerUiStore()
    store.setGenerationActivity({
      phase: GenerationActivityPhase.Tool,
      label: 'Tool · update_world_bible (streaming input)',
      section: BibleSection.SOUNDTRACKS,
      toolName: 'update_world_bible',
    })

    const seqBefore = store.pendingChatPromptSeq
    store.requestChatPrompt('Regenerate soundtracks', BibleSection.SOUNDTRACKS)

    const after = getStorytellerUiStore()
    expect(after.pendingChatPrompt).toBeNull()
    expect(after.pendingChatPromptSeq).toBe(seqBefore)
    expect(after.generationActivity.phase).toBe(GenerationActivityPhase.Tool)
  })

  it('marks generation submitted when a prompt is queued from idle', () => {
    const store = getStorytellerUiStore()
    store.requestChatPrompt('Regenerate soundtracks', BibleSection.SOUNDTRACKS)

    const after = getStorytellerUiStore()
    expect(after.pendingChatPrompt?.message).toContain('Regenerate')
    expect(after.generationActivity.phase).toBe(GenerationActivityPhase.Submitted)
  })

  it('still blocks while consistency fix is running', () => {
    const store = getStorytellerUiStore()
    store.setConsistencyFixRun({ phase: ConsistencyFixRunPhase.Scanning })
    const seqBefore = store.pendingChatPromptSeq

    store.requestChatPrompt('Should not queue', BibleSection.SOUNDTRACKS)

    const after = getStorytellerUiStore()
    expect(after.pendingChatPrompt).toBeNull()
    expect(after.pendingChatPromptSeq).toBe(seqBefore)
    expect(after.consistencyFixRun.phase).toBe(ConsistencyFixRunPhase.Scanning)
  })
})
