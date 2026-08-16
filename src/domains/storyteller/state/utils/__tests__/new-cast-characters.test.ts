import { describe, expect, it } from 'vitest'
import { ActionType } from '@/domains/storyteller/core/types/enums'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { CharacterRole } from '@/shared/data/constants/protocol'
import { recordArrayFromJson, recordFromJson, readString } from '@/shared/data/json-guards'
import {
  collectCastCandidates,
  existingCastNames,
  newCastMembers,
  updateCastAction,
} from '../new-cast-characters'

const VERA_LOGLINE = 'Vera confronts Marcus in the salt marsh.'
const VERA_SENTENCE = 'Vera keeps the wardens at bay.'
const WORLD_DESCRIPTION =
  'The city sinks at dusk. [Vera][char-vera] keeps the wardens at bay. Fog swallows the pier.'

describe('collectCastCandidates', () => {
  it('picks beat charactersInvolved with the logline as description', () => {
    const candidates = collectCastCandidates({
      beatPayloads: [
        {
          logline: VERA_LOGLINE,
          charactersInvolved: ['Vera', 'Marcus'],
        },
      ],
    })

    expect(candidates).toEqual([
      { name: 'Vera', description: VERA_LOGLINE },
      { name: 'Marcus', description: VERA_LOGLINE },
    ])
  })

  it('picks a char reference from a world-description preview with its sentence', () => {
    const candidates = collectCastCandidates({
      previews: [{ worldDescription: WORLD_DESCRIPTION }],
    })

    expect(candidates).toEqual([{ name: 'Vera', description: VERA_SENTENCE }])
  })

  it('collapses the same name across beat and preview sources', () => {
    const candidates = collectCastCandidates({
      previews: [{ worldDescription: WORLD_DESCRIPTION }],
      beatPayloads: [
        {
          logline: VERA_LOGLINE,
          charactersInvolved: ['Vera'],
        },
      ],
    })

    expect(candidates).toEqual([{ name: 'Vera', description: VERA_SENTENCE }])
  })
})

describe('newCastMembers', () => {
  it('drops names already in characters or storyPlan.cast, case-insensitive', () => {
    const candidates = collectCastCandidates({
      beatPayloads: [
        {
          logline: VERA_LOGLINE,
          charactersInvolved: ['Vera', 'Marcus', 'Lina'],
        },
      ],
    })
    const existing = existingCastNames(
      [{ name: 'vera' }],
      { cast: [{ name: 'MARCUS' }] },
    )

    expect(newCastMembers(candidates, existing)).toEqual([
      { name: 'Lina', description: VERA_LOGLINE },
    ])
  })
})

describe('updateCastAction', () => {
  it('preserves existing cast entries and appends supporting additions', () => {
    const existing = [{ name: 'Vera', role: CharacterRole.Lead }]
    const action = updateCastAction({
      existingCast: existing,
      additions: [{ name: 'Lina', description: VERA_LOGLINE }],
    })
    const payload = recordFromJson(action.payload)
    const cast = recordArrayFromJson(payload[CastFieldAlias.Cast])

    expect(action.type).toBe(ActionType.UPDATE_CAST)
    expect(action.status).toBe(ApprovalActionStatus.COMMITTED)
    expect(cast).toHaveLength(2)
    expect(readString(cast[0]?.name)).toBe('Vera')
    expect(readString(cast[1]?.name)).toBe('Lina')
    expect(readString(cast[1]?.role)).toBe(CharacterRole.Supporting)
    expect(readString(cast[1]?.description)).toBe(VERA_LOGLINE)
  })
})
