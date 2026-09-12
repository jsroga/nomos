import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  beatsInSequenceOrder,
  renumberBeatSequences,
  reorderBeatsById,
} from '../utils/cork-board-beats'

const beats = [
  { id: 'a', sequence: 1 },
  { id: 'b', sequence: 2 },
  { id: 'c', sequence: 3 },
]

describe('beatsInSequenceOrder', () => {
  it('does not mutate the source list', () => {
    const shuffled = [
      { id: 'c', sequence: 3 },
      { id: 'a', sequence: 1 },
      { id: 'b', sequence: 2 },
    ]
    expect(beatsInSequenceOrder(shuffled).map(beat => beat.id)).toEqual(['a', 'b', 'c'])
    expect(shuffled.map(beat => beat.id)).toEqual(['c', 'a', 'b'])
  })
})

describe('renumberBeatSequences', () => {
  it('writes 1..n in list order', () => {
    expect(renumberBeatSequences([{ id: 'c', sequence: 9 }, { id: 'a', sequence: 4 }])).toEqual([
      { id: 'c', sequence: 1 },
      { id: 'a', sequence: 2 },
    ])
  })
})

describe('reorderBeatsById', () => {
  it('moves a card onto another and renumbers 1..n', () => {
    const moved = reorderBeatsById(beats, 'c', 'a')
    expect(moved?.map(beat => beat.id)).toEqual(['c', 'a', 'b'])
    expect(moved?.map(beat => beat.sequence)).toEqual([1, 2, 3])
  })

  it('uses sequence order, not array order', () => {
    const shuffled = [
      { id: 'c', sequence: 3 },
      { id: 'a', sequence: 1 },
      { id: 'b', sequence: 2 },
    ]
    expect(reorderBeatsById(shuffled, 'a', 'c')?.map(beat => beat.id)).toEqual(['b', 'c', 'a'])
  })

  it('returns null when the drop is a no-op', () => {
    expect(reorderBeatsById(beats, 'a', 'a')).toBeNull()
    expect(reorderBeatsById(beats, '', 'a')).toBeNull()
    expect(reorderBeatsById(beats, 'missing', 'a')).toBeNull()
  })
})

describe('CorkBoardBeatGrid numbering', () => {
  it('shows the visual index, not the stored sequence field', () => {
    const src = readFileSync('src/domains/storyteller/ui/CorkBoard/CorkBoardBeatGrid.tsx', 'utf8')
    expect(src).toContain('displaySequence={index + 1}')
  })
})
