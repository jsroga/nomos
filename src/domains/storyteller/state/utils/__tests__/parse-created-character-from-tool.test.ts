import { describe, expect, it } from 'vitest'
import { isSuccessfulCharacterMutation } from '../parse-created-character-from-tool'
import {
  CHARACTER_TOOL_ID,
  EPISODE_TOOL_ID,
  ManageToolOperation,
} from '@/domains/storyteller/ai/tools/manage-tools-wire'

const PROJECT_ID = '0696e553-d361-4a36-a839-fb9c5e570e75'
const CHARACTER_ID = '8db804d0-1c39-498e-97a5-dfd7eb828789'

describe('isSuccessfulCharacterMutation', () => {
  it('accepts a successful manage_character create', () => {
    expect(
      isSuccessfulCharacterMutation({
        toolName: CHARACTER_TOOL_ID,
        args: {
          operation: ManageToolOperation.Create,
          projectId: PROJECT_ID,
          data: { name: 'Vex' },
        },
        result: {
          success: true,
          message: 'Created character "Vex" (Protagonist)',
          character: { id: CHARACTER_ID, name: 'Vex' },
        },
      }),
    ).toBe(true)
  })

  it('accepts successful update and delete', () => {
    expect(
      isSuccessfulCharacterMutation({
        toolName: CHARACTER_TOOL_ID,
        args: { operation: ManageToolOperation.Update, characterId: CHARACTER_ID },
        result: { success: true, character: { id: CHARACTER_ID, name: 'Vex' } },
      }),
    ).toBe(true)
    expect(
      isSuccessfulCharacterMutation({
        toolName: CHARACTER_TOOL_ID,
        args: { operation: ManageToolOperation.Delete, characterId: CHARACTER_ID },
        result: { success: true },
      }),
    ).toBe(true)
  })

  it('ignores get, failed creates, and other tools', () => {
    expect(
      isSuccessfulCharacterMutation({
        toolName: CHARACTER_TOOL_ID,
        args: { operation: ManageToolOperation.Get, characterId: CHARACTER_ID },
        result: { success: true, character: { id: CHARACTER_ID, name: 'Vex' } },
      }),
    ).toBe(false)
    expect(
      isSuccessfulCharacterMutation({
        toolName: CHARACTER_TOOL_ID,
        args: { operation: ManageToolOperation.Create, data: { name: 'Vex' } },
        result: { success: false, error: 'nope' },
      }),
    ).toBe(false)
    expect(
      isSuccessfulCharacterMutation({
        toolName: EPISODE_TOOL_ID,
        args: { operation: ManageToolOperation.Create },
        result: { success: true },
      }),
    ).toBe(false)
  })
})
