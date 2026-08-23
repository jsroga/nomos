import { describe, expect, it, beforeEach } from 'vitest'
import { getStorytellerUiStore } from '../useStorytellerUiStore'
import { GenerationActivityPhase } from '@/domains/storyteller/state/constants/storyteller-ui-store'
import { ConsistencyFixRunPhase } from '@/domains/storyteller/ui/FixInconsistencies/constants/fix-inconsistencies-dialog'
import { BibleSection } from '@/domains/storyteller/core/types/enums'

describe('requestChatPrompt', () => {
  beforeEach(() => {
    const store = getStorytellerUiStore()
    store.clearPendingChatPrompt()
    store.clearGenerationActivity()
    store.resetConsistencyFixRun()
  })

  it('queues a prompt even when generationActivity is still busy from a crashed turn', () => {
    const store = getStorytellerUiStore()
    store.setGenerationActivity({
      phase: GenerationActivityPhase.Tool,
      label: 'Tool · update_world_bible (streaming input)',
      section: BibleSection.SOUNDTRACKS,
      toolName: 'update_world_bible',
    })

    store.requestChatPrompt('Regenerate soundtracks', BibleSection.SOUNDTRACKS)

    const after = getStorytellerUiStore()
    expect(after.pendingChatPrompt?.message).toContain('Regenerate')
    expect(after.pendingChatPrompt?.section).toBe(BibleSection.SOUNDTRACKS)
    expect(after.pendingChatPromptSeq).toBe(1)
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
