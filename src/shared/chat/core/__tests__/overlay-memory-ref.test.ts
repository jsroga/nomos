import { describe, expect, it } from 'vitest'
import { MemoryThreadPrefix, overlayMemoryRef, memoryRef } from '@/shared/agent-kernel/mastra/memory-ref'

const USER_A = 'user-a'
const USER_B = 'user-b'
const SESSION_A = '11111111-1111-4111-8111-111111111111'
const SESSION_B = '22222222-2222-4222-8222-222222222222'

describe('overlayMemoryRef', () => {
  it('gives two session ids two distinct overlay threads', () => {
    const a = overlayMemoryRef({ id: SESSION_A, userId: USER_A })
    const b = overlayMemoryRef({ id: SESSION_B, userId: USER_A })
    expect(a.thread).toBe(`${MemoryThreadPrefix.Overlay}:${SESSION_A}`)
    expect(b.thread).toBe(`${MemoryThreadPrefix.Overlay}:${SESSION_B}`)
    expect(a.thread).not.toBe(b.thread)
    expect(a.resource).toBe(USER_A)
    expect(b.resource).toBe(USER_A)
  })

  it('is not equal to memoryRef for the same user', () => {
    const overlay = overlayMemoryRef({ id: SESSION_A, userId: USER_A })
    const live = memoryRef({ projectId: 'proj-a', episodeId: 'ep-1', userId: USER_A })
    expect(overlay.thread).not.toBe(live.thread)
    expect(overlay.resource).toBe(USER_A)
  })

  it('scopes resource to the given user', () => {
    const a = overlayMemoryRef({ id: SESSION_A, userId: USER_A })
    const b = overlayMemoryRef({ id: SESSION_A, userId: USER_B })
    expect(a.thread).toBe(b.thread)
    expect(a.resource).not.toBe(b.resource)
  })
})
