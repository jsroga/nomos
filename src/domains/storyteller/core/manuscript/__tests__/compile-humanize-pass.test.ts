import { describe, expect, it } from 'vitest'
import { claimCheckBeat } from '@/domains/storyteller/core/claim-check'
import { runCompileHumanizePass } from '@/domains/storyteller/core/manuscript/compile-humanize-pass'

const SOURCE = 'Vera says "the bells" on 2024-01-02.'

describe('runCompileHumanizePass', () => {
  it('skips persist when claim-check fails and keeps persist when claims survive', async () => {
    const failed = await runCompileHumanizePass({
      compiled: SOURCE,
      humanize: async () => 'Vera says nothing.',
      claimCheck: claimCheckBeat,
    })
    expect(failed.persist).toBe(false)
    expect(failed.humanized).toBeNull()

    const ok = await runCompileHumanizePass({
      compiled: SOURCE,
      humanize: async draft => draft,
      claimCheck: claimCheckBeat,
    })
    expect(ok.persist).toBe(true)
    expect(ok.humanized).toBe(SOURCE)
  })
})
