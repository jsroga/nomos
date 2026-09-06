import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AfterBeatStateWriteError } from '@/domains/storyteller/core/types/after-beat-state'

const returning = vi.fn()

vi.mock('@/db/client', () => ({
  db: {
    update: () => ({
      set: () => ({
        where: () => ({
          returning,
        }),
      }),
    }),
  },
}))

import { writeAfterBeatState } from '@/domains/storyteller/core/io/after-beat-state-write'
import { afterBeatStateFromApprovedBeat } from '@/domains/storyteller/core/types/after-beat-state'

const STATE = afterBeatStateFromApprovedBeat({
  charactersInvolved: ['Vera'],
  setupFor: 'the silver bell',
})

describe('writeAfterBeatState', () => {
  beforeEach(() => {
    returning.mockReset()
  })

  it('writes a parsed AfterBeatState row on Approve', async () => {
    returning.mockResolvedValue([{ id: 'beat-1' }])
    await writeAfterBeatState('beat-1', STATE)
    expect(returning).toHaveBeenCalled()
  })

  it('fails the persist when no beat row is updated', async () => {
    returning.mockResolvedValue([])
    await expect(writeAfterBeatState('beat-1', STATE)).rejects.toThrow(
      AfterBeatStateWriteError.SaveMissed
    )
  })
})
