import { describe, expect, it } from 'vitest'
import { emptyBeatDraftCanon, type BeatDraftCanonBeat } from '@/domains/storyteller/core/types/beat-draft-canon'
import { FindingSeverity } from '@/domains/storyteller/core/types/finding'
import { BeatSequenceLabel, CausalFindingCopy, CausalFindingQuote } from '../constants'
import { causalBeatQuote, checkCausalGraph } from '../causal'

const UUID_BEAT_IDS = [
  '05ef937b-a073-49f7-88ed-cf4136084a74',
  '0935af94-6ec8-450e-ab58-0cd35a48e4fe',
  '193661f8-bfa9-4c6c-9da2-10cc0b6bd270',
  '2769181a-e1e6-48c7-85c2-dec36cf274c0',
  '342068ed-e80e-4d68-bb35-e9033f7ad1dd',
] as const

const UUID_QUOTE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function boardBeat(
  id: string,
  sequence: number,
  overrides: Partial<BeatDraftCanonBeat> = {}
): BeatDraftCanonBeat {
  return {
    id,
    sequence,
    content: `INT. BEAT ${sequence}`,
    causalDependencies: [],
    beatType: 'scene',
    ...overrides,
  }
}

describe('checkCausalGraph', () => {
  it('does not dump unused corkboard ids as dropped threads on a next-beat draft', () => {
    const beats = UUID_BEAT_IDS.map((id, index) => boardBeat(id, index + 1))
    const findings = checkCausalGraph(
      emptyBeatDraftCanon({
        nextSequence: beats.length + 1,
        beats,
      })
    )
    expect(findings.filter(row => row.whyItFails === CausalFindingCopy.DroppedWhy)).toEqual([])
    expect(findings.some(row => UUID_QUOTE.test(row.location.quote))).toBe(false)
    expect(findings.some(row => row.location.quote === CausalFindingQuote.ThisDraft)).toBe(false)
  })

  it('treats a sequential next beat as parented by the last card', () => {
    const findings = checkCausalGraph(
      emptyBeatDraftCanon({
        nextSequence: 2,
        beats: [boardBeat('beat-1', 1)],
      })
    )
    expect(findings.some(row => row.whyItFails === CausalFindingCopy.OrphanWhy)).toBe(false)
  })

  it('quotes this draft instead of the phantom id when the board has no parent', () => {
    const findings = checkCausalGraph(emptyBeatDraftCanon({ nextSequence: 2, beats: [] }))
    const orphan = findings.find(row => row.whyItFails === CausalFindingCopy.OrphanWhy)
    expect(orphan?.severity).toBe(FindingSeverity.Error)
    expect(orphan?.location.quote).toBe(CausalFindingQuote.ThisDraft)
  })

  it('quotes a dropped thread by slugline when the corkboard graph is in use', () => {
    const findings = checkCausalGraph(
      emptyBeatDraftCanon({
        nextSequence: 4,
        beats: [
          boardBeat('beat-1', 1, { content: 'INT. START' }),
          boardBeat('2769181a-e1e6-48c7-85c2-dec36cf274c0', 2, {
            content: 'INT. THE LEDGER ROOM',
            causalDependencies: ['beat-1'],
          }),
          boardBeat('beat-3', 3, { content: 'INT. THE FLOOD DISTRICT' }),
        ],
      })
    )
    const dropped = findings.filter(row => row.whyItFails === CausalFindingCopy.DroppedWhy)
    expect(dropped.map(row => row.location.quote)).toEqual(['INT. THE LEDGER ROOM'])
    expect(dropped.some(row => UUID_QUOTE.test(row.location.quote))).toBe(false)
  })

  it('labels beats without content as beat N', () => {
    expect(
      causalBeatQuote(
        emptyBeatDraftCanon({
          beats: [boardBeat('beat-2', 2, { content: null })],
        }),
        'beat-2'
      )
    ).toBe(`${BeatSequenceLabel.Prefix} 2`)
  })
})
