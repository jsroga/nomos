import { describe, expect, it } from 'vitest'
import { compactToolAckMessage, isCompactToolAck } from '../compact-tool-ack'

const SLIM_MESSAGE =
  'Proposed fields for the unsaved character form.\n\nApply in the dialog to keep them. Nothing is saved to the world yet.'

describe('compact tool ack', () => {
  it('reads message from a slim { success, message } result', () => {
    const result = { success: true, message: SLIM_MESSAGE }
    expect(isCompactToolAck(result)).toBe(true)
    expect(compactToolAckMessage(result)).toBe(SLIM_MESSAGE)
  })

  it('ignores results that still echo fields', () => {
    const result = {
      success: true,
      message: SLIM_MESSAGE,
      fields: { name: 'Ellis Ward' },
    }
    expect(isCompactToolAck(result)).toBe(false)
    expect(compactToolAckMessage(result)).toBeNull()
  })
})
