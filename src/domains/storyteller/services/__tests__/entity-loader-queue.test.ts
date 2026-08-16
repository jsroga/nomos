import { describe, expect, it, vi } from 'vitest'
import {
  enqueueEntityLoad,
  rejectEntityLoadWaiters,
  resolveEntityLoadWaiters,
} from '../entity-loader-queue'

describe('enqueueEntityLoad', () => {
  it('keeps every waiter for the same entity id', () => {
    const queue = new Map()
    const first = { resolve: vi.fn(), reject: vi.fn() }
    const second = { resolve: vi.fn(), reject: vi.fn() }

    enqueueEntityLoad(queue, 'proj:char-1', 'proj', 'short', first)
    enqueueEntityLoad(queue, 'proj:char-1', 'proj', 'a longer surrounding sentence', second)

    const item = queue.get('proj:char-1')
    expect(item?.waiters).toHaveLength(2)
    expect(item?.context).toBe('a longer surrounding sentence')
  })
})

describe('entity load waiters', () => {
  it('resolves every waiter with the loaded entity', () => {
    const first = { resolve: vi.fn(), reject: vi.fn() }
    const second = { resolve: vi.fn(), reject: vi.fn() }
    resolveEntityLoadWaiters(
      { waiters: [first, second], projectId: 'proj' },
      null
    )
    expect(first.resolve).toHaveBeenCalledWith(null)
    expect(second.resolve).toHaveBeenCalledWith(null)
  })

  it('rejects every waiter when the batch fails', () => {
    const first = { resolve: vi.fn(), reject: vi.fn() }
    const error = new Error('network')
    rejectEntityLoadWaiters({ waiters: [first], projectId: 'proj' }, error)
    expect(first.reject).toHaveBeenCalledWith(error)
  })
})
