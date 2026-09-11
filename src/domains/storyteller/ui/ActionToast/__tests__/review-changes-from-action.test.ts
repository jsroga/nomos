import { describe, expect, it } from 'vitest'
import { ActionType } from '@/domains/storyteller/core/types/enums'
import { ActionPayloadKey } from '@/domains/storyteller/core/formatting/constants/action-display'
import { CharacterTextFieldKey } from '@/domains/storyteller/core/character-missing-fields'
import { reviewChangesFromAction } from '../review-changes-from-action'

const DESCRIPTION =
  'A brilliant political tactician with a sharp wit and a guarded heart.'

describe('reviewChangesFromAction', () => {
  it('shows the character JSON inside draft, not the resume envelope', () => {
    const inner = {
      [CharacterTextFieldKey.Name]: 'Vivienne Ardent',
      [CharacterTextFieldKey.Description]: DESCRIPTION,
    }
    const changes = reviewChangesFromAction({
      type: ActionType.UPDATE_CHARACTER,
      payload: {
        [ActionPayloadKey.Draft]: JSON.stringify(inner),
        [ActionPayloadKey.RunId]: '657a642d-6f34-4748-8b95-1337461d2287',
      },
    })
    expect(changes).toEqual(inner)
  })

  it('passes through a fields payload that is already the character', () => {
    const fields = {
      [CharacterTextFieldKey.Name]: 'Vera',
      [CharacterTextFieldKey.Description]: DESCRIPTION,
    }
    expect(
      reviewChangesFromAction({
        type: ActionType.UPDATE_CHARACTER,
        payload: fields,
      }),
    ).toEqual(fields)
  })
})
