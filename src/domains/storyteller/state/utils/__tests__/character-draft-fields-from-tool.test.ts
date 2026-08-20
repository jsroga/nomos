import { describe, expect, it } from 'vitest'
import { CharacterTextFieldKey } from '@/domains/storyteller/core/character-missing-fields'
import { StorytellerChatTool } from '@/domains/storyteller/core/storyteller-page-wire'
import { characterDraftFieldsFromToolCall, isCharacterDraftToolArgs } from '../character-draft-fields-from-tool'

const VERA = 'Vera'

describe('characterDraftFieldsFromToolCall', () => {
  it('returns null for other tools', () => {
    expect(
      characterDraftFieldsFromToolCall({
        toolName: StorytellerChatTool.ManageBeat,
        args: { name: VERA },
        result: { success: true },
      })
    ).toBeNull()
  })

  it('prefers result.fields then falls back to args', () => {
    expect(
      characterDraftFieldsFromToolCall({
        toolName: StorytellerChatTool.ProposeCharacterFields,
        args: { [CharacterTextFieldKey.Name]: 'Other' },
        result: { success: true, fields: { [CharacterTextFieldKey.Motivation]: 'Protect' } },
      })
    ).toEqual({ [CharacterTextFieldKey.Motivation]: 'Protect' })

    expect(
      characterDraftFieldsFromToolCall({
        toolName: StorytellerChatTool.ProposeCharacterFields,
        args: { [CharacterTextFieldKey.Name]: VERA },
        result: { success: true, fields: {} },
      })
    ).toEqual({ [CharacterTextFieldKey.Name]: VERA })
  })

  it('detects propose-character tool args for add-to-world', () => {
    expect(isCharacterDraftToolArgs([{ [CharacterTextFieldKey.Motivation]: 'Protect' }])).toBe(
      false,
    )
    expect(isCharacterDraftToolArgs([{ worldDescription: 'A marsh city.' }])).toBe(false)
    expect(
      isCharacterDraftToolArgs(
        [{ factions: [{ name: VERA, description: 'Wardens of the marsh.' }] }],
      ),
    ).toBe(false)
    expect(
      isCharacterDraftToolArgs([], [StorytellerChatTool.ProposeCharacterFields]),
    ).toBe(true)
  })
})
