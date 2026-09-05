import { describe, expect, it } from 'vitest'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { emptyBeatDraftCanon } from '@/domains/storyteller/ai/workflows/beat-draft-canon'
import {
  beatsCoveringCaret,
  packScriptGhostContext,
  ScriptGhostPackHeading,
} from '@/domains/storyteller/ai/workflows/pack-script-ghost-context'
import { recordFromJson } from '@/shared/data/json-guards'
import { EMPTY_VOICE_FINGERPRINT } from '@/domains/storyteller/core/voice/voice-fingerprint'

const TWIST = 'THE_BELLS_ARE_VERA'

const CANON = emptyBeatDraftCanon({
  sections: {
    [BibleSection.WORLD_DESCRIPTION]: 'a harbour city',
    [BibleSection.PLOT_TWISTS]: [{ secret: TWIST }],
  },
  beats: [
    {
      id: 'beat-1',
      sequence: 1,
      content: 'Vera enters the chapel.',
      causalDependencies: [],
      beatType: null,
    },
    {
      id: 'beat-2',
      sequence: 2,
      content: 'Marcus denies the bells.',
      causalDependencies: [],
      beatType: null,
    },
  ],
  currentRoadmapSlotText: 'Vera confronts Marcus in the chapel',
})

describe('packScriptGhostContext', () => {
  it('Author canon omits PLOT_TWISTS and does not leak the twist secret', () => {
    const packed = packScriptGhostContext({
      masterPrompt: 'Write in a spare register.',
      canon: CANON,
      episodePremise: 'Vera hunts the bells.',
      prefix: 'INT. CHAPEL - NIGHT\nVera waits.',
      charactersInvolved: ['Vera'],
    })

    const canonLine = packed.split('\n').find(line => line.startsWith('{')) ?? '{}'
    const authorSections = recordFromJson(JSON.parse(canonLine))
    expect(authorSections[BibleSection.PLOT_TWISTS]).toBeUndefined()
    expect(Object.keys(authorSections)).not.toContain(BibleSection.PLOT_TWISTS)
    expect(packed).not.toContain(TWIST)
    expect(packed).toContain(ScriptGhostPackHeading.Premise)
    expect(packed).toContain(ScriptGhostPackHeading.Manuscript)
    expect(packed).toContain('INT. CHAPEL - NIGHT')
  })

  it('omits fingerprints for cast not in charactersInvolved', () => {
    const packed = packScriptGhostContext({
      masterPrompt: 'Write in a spare register.',
      canon: CANON,
      episodePremise: 'Vera hunts the bells.',
      prefix: 'INT. CHAPEL - NIGHT\nVera waits.',
      charactersInvolved: ['Vera'],
      fingerprints: [
        {
          name: 'Vera',
          voice: { ...EMPTY_VOICE_FINGERPRINT, register: 'clipped', sampleLines: ['Close the chapel.'] },
        },
        {
          name: 'Marcus',
          voice: {
            ...EMPTY_VOICE_FINGERPRINT,
            register: 'oily',
            sampleLines: ['The bells were always mine.'],
          },
        },
      ],
    })

    expect(packed).toContain('Close the chapel.')
    expect(packed).not.toContain('The bells were always mine.')
  })

  it('beatsCoveringCaret returns the first beat on an empty prefix', () => {
    const covering = beatsCoveringCaret(CANON.beats, '')
    expect(covering).toHaveLength(1)
    expect(covering[0]?.id).toBe('beat-1')
  })
})
