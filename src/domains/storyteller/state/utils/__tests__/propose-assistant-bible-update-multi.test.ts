import { describe, expect, it } from 'vitest'
import { proposeAssistantBibleUpdates } from '../propose-assistant-bible-update'
import { UPDATE_WORLD_BIBLE_TOOL_ID } from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { CharacterDraftChatSection } from '@/domains/storyteller/core/storyteller-page-wire'

describe('proposeAssistantBibleUpdates', () => {
  it('splits overview, factions, and plot twists into independent proposals', () => {
    const factions = [{ name: 'The Ledger Keepers', description: 'They tally every death.' }]
    const plotTwists = [{ title: 'The clerk wrote her own name.', description: 'She always had.' }]
    const proposals = proposeAssistantBibleUpdates({
      toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
      args: {
        worldDescription: 'The world of Aeternum is defined by a single impossible fact.',
        factions,
        plotTwists,
      },
      result: {
        success: true,
        updatedFields: ['worldDescription', 'factions', 'plotTwists'],
      },
    })

    expect(proposals.map(proposal => proposal.section)).toEqual([
      BibleSection.WORLD_DESCRIPTION,
      BibleSection.FACTIONS,
      BibleSection.PLOT_TWISTS,
    ])
    expect(proposals[0]?.preview.worldDescription).toContain('Aeternum')
    expect(proposals[0]?.preview.factions).toBeUndefined()
    expect(proposals[1]?.preview.factions).toEqual(factions)
    expect(proposals[2]?.preview.plotTwists).toEqual(plotTwists)
  })

  it('returns no proposals when the turn is character-draft', () => {
    const proposals = proposeAssistantBibleUpdates(
      {
        toolName: UPDATE_WORLD_BIBLE_TOOL_ID,
        args: { worldDescription: 'Bot missing-field ramble overwrites Overview.' },
        result: { success: true, updatedFields: ['worldDescription'] },
      },
      null,
      CharacterDraftChatSection.Form,
    )
    expect(proposals).toEqual([])
  })
})
