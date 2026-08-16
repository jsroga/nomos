import { describe, expect, it } from 'vitest'
import { mapLinkedValue } from '../entity-auto-linker-map'
import { ENTITY_AUTO_LINKER_MIN_STRING_LENGTH } from '../constants/entity-auto-linker'

async function linkMarcus(text: string): Promise<string> {
  return text.replaceAll('Marcus', '[Marcus][char-marcus]')
}

describe('mapLinkedValue', () => {
  it('rewrites nested episode premise strings including tenPointsPlan', async () => {
    const linked = await mapLinkedValue(
      {
        episodeId: '0696e553-d361-4a36-a839-fb9c5e570e75',
        premise: {
          logline: 'Marcus finds the ledger.',
          protagonistHook: 'Marcus is called to the ward.',
          tenPointsPlan: ['Marcus opens the clinic.', { action: 'Marcus burns the page.' }],
        },
      },
      linkMarcus,
      ENTITY_AUTO_LINKER_MIN_STRING_LENGTH
    )

    expect(linked).toEqual({
      episodeId: '0696e553-d361-4a36-a839-fb9c5e570e75',
      premise: {
        logline: '[Marcus][char-marcus] finds the ledger.',
        protagonistHook: '[Marcus][char-marcus] is called to the ward.',
        tenPointsPlan: [
          '[Marcus][char-marcus] opens the clinic.',
          { action: '[Marcus][char-marcus] burns the page.' },
        ],
      },
    })
  })

  it('leaves short strings unchanged', async () => {
    const linked = await mapLinkedValue(
      { title: 'Pilot' },
      linkMarcus,
      ENTITY_AUTO_LINKER_MIN_STRING_LENGTH
    )
    expect(linked).toEqual({ title: 'Pilot' })
  })
})
