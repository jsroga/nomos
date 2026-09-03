import { describe, expect, it } from 'vitest'
import { memoryRef } from '@/shared/agent-kernel/mastra/memory-ref'

const USER = 'user-1'

describe('memoryRef', () => {
  it('isolates two projects for the same user', () => {
    const a = memoryRef({ projectId: 'proj-a', episodeId: 'ep-1', userId: USER })
    const b = memoryRef({ projectId: 'proj-b', episodeId: 'ep-1', userId: USER })
    expect(a.thread).not.toBe(b.thread)
    expect(a.resource).toBe(USER)
    expect(b.resource).toBe(USER)
  })

  it('uses _ when episode is missing', () => {
    const ref = memoryRef({ projectId: 'proj-a', userId: USER })
    expect(ref.thread).toContain(':_:')
  })
})
