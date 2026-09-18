import { describe, expect, it } from 'vitest'
import { CharacterTextFieldKey } from '@/domains/storyteller/core/character-missing-fields'
import {
  ProposeCharacterFieldsCopy,
  ProposeCharacterFieldsOutputSchema,
  buildProposeCharacterFieldsOutput,
} from '../propose-character-fields-tool'
import { PROPOSE_CHARACTER_FIELDS_TOOL_DESC } from '../manage-tools-wire'

describe('propose_character_fields output', () => {
  it('acks without echoing proposed fields', () => {
    expect(
      buildProposeCharacterFieldsOutput({
        [CharacterTextFieldKey.Name]: 'Ellis Ward',
        [CharacterTextFieldKey.Role]: 'Protagonist',
      }),
    ).toEqual({
      success: true,
      message: ProposeCharacterFieldsCopy.Proposed,
    })
    expect(ProposeCharacterFieldsCopy.Proposed).toContain('Apply in the dialog')
    expect(ProposeCharacterFieldsCopy.Empty).toContain('The form is unchanged')
  })

  it('strips leftover fields keys at the schema boundary', () => {
    expect(
      ProposeCharacterFieldsOutputSchema.parse({
        success: true,
        message: ProposeCharacterFieldsCopy.Proposed,
        fields: { [CharacterTextFieldKey.Name]: 'Ellis Ward' },
      }),
    ).toEqual({
      success: true,
      message: ProposeCharacterFieldsCopy.Proposed,
    })
  })

  it('reports empty when no usable fields were proposed', () => {
    expect(buildProposeCharacterFieldsOutput({})).toEqual({
      success: false,
      message: ProposeCharacterFieldsCopy.Empty,
    })
  })

  it('tells the model to put fatalFlaw and secrets in tool arguments', () => {
    expect(PROPOSE_CHARACTER_FIELDS_TOOL_DESC).toContain(CharacterTextFieldKey.FatalFlaw)
    expect(PROPOSE_CHARACTER_FIELDS_TOOL_DESC).toContain(CharacterTextFieldKey.Secrets)
    expect(PROPOSE_CHARACTER_FIELDS_TOOL_DESC).toContain('tool arguments')
    expect(PROPOSE_CHARACTER_FIELDS_TOOL_DESC).toContain(CharacterTextFieldKey.Mbti)
    expect(PROPOSE_CHARACTER_FIELDS_TOOL_DESC).toContain('highly recommended')
  })
})
