import { describe, expect, it } from 'vitest'
import { extractScriptDialogue, scriptDialogueBySpeaker } from '../extract-script-dialogue'

const VERA = 'VERA'
const MARCUS = 'MARCUS'

describe('extractScriptDialogue', () => {
  it('attributes an interruption to the speaker who was cut off', () => {
    const lines = extractScriptDialogue(`INT. WARD - NIGHT

${VERA}
If you open that--

${MARCUS}
I already did.`)
    expect(lines).toEqual([
      { speaker: VERA, text: 'If you open that--' },
      { speaker: MARCUS, text: 'I already did.' },
    ])
  })

  it('keeps unattributed lines without inventing a cue', () => {
    const lines = extractScriptDialogue(`INT. WARD - NIGHT

Someone left the ledger open.

${VERA}
Close it.`)
    expect(lines).toEqual([
      { speaker: null, text: 'Someone left the ledger open.' },
      { speaker: VERA, text: 'Close it.' },
    ])
  })

  it('keeps one speaker holding the floor across consecutive dialogue lines', () => {
    const lines = extractScriptDialogue(`${VERA}
I have been waiting.
I will wait longer.
Until the ledger burns.`)
    expect(lines.every(line => line.speaker === VERA)).toBe(true)
    expect(lines).toHaveLength(3)
    const bySpeaker = scriptDialogueBySpeaker(`${VERA}
I have been waiting.
I will wait longer.`)
    expect(bySpeaker.get(VERA)).toEqual(['I have been waiting.', 'I will wait longer.'])
  })
})
