import { describe, expect, it } from 'vitest'
import { extractNovelDialogue, novelDialogueBySpeaker } from '../extract-novel-dialogue'

const VERA = 'Vera'
const MARCUS = 'Marcus'

describe('extractNovelDialogue', () => {
  it('attributes an interrupted quote to the speaker who was cut off', () => {
    const lines = extractNovelDialogue(
      `"If you open that--" said ${VERA}.\n\n"I already did," ${MARCUS} said.`,
    )
    expect(lines).toEqual([
      { speaker: VERA, text: 'If you open that--' },
      { speaker: MARCUS, text: 'I already did,' },
    ])
  })

  it('keeps unattributed quotes without inventing a speaker', () => {
    const lines = extractNovelDialogue(`"The ledger is open."\n\n"${VERA} should close it," said ${MARCUS}.`)
    expect(lines[0]).toEqual({ speaker: null, text: 'The ledger is open.' })
    expect(lines[1]?.speaker).toBe(MARCUS)
  })

  it('keeps one speaker holding the floor across consecutive quotes', () => {
    const lines = extractNovelDialogue(
      `"I have been waiting," ${VERA} said. "I will wait longer." "Until the ledger burns."`,
    )
    expect(lines.every(line => line.speaker === VERA)).toBe(true)
    expect(lines).toHaveLength(3)
    expect(novelDialogueBySpeaker(`"Hold," ${VERA} said. "Still."`).get(VERA)).toEqual(['Hold,', 'Still.'])
  })
})
