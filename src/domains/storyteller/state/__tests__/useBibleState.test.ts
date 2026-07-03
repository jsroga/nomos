/**
 * @vitest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useBibleState } from '../queries/useBibleState'

const pushMock = vi.fn()
const replaceMock = vi.fn()
const useBibleLockMock = vi.fn()
const getUserMock = vi.fn()

let searchParams = new URLSearchParams()
let pathname = '/app/project-1/storyteller'

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  usePathname: () => pathname,
}))

vi.mock('@/domains/storyteller/state/queries/useBibleLock', () => ({
  useBibleLock: (projectId: string | undefined) => useBibleLockMock(projectId),
}))

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => ({
    auth: {
      getUser: () => getUserMock(),
    },
  }),
}))

describe('useBibleState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchParams = new URLSearchParams()
    pathname = '/app/project-1/storyteller'

    useBibleLockMock.mockReturnValue({
      data: { isLocked: false, lockedBy: null, lockedAt: null },
    })
    getUserMock.mockResolvedValue({
      data: { user: { email: 'writer@example.com' } },
    })
  })

  it('opens the Storybible by default on first visit and exposes the fetched user email', async () => {
    const { result } = renderHook(() => useBibleState('project-1'))

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/app/project-1/storyteller?bible=open', {
        scroll: false,
      })
      expect(result.current.userEmail).toBe('writer@example.com')
    })
  })

  it('surfaces bible lock state and dispatches the opened event when toggled on', async () => {
    searchParams = new URLSearchParams('bible=off')
    useBibleLockMock.mockReturnValue({
      data: { isLocked: true, lockedBy: 'editor@example.com', lockedAt: null },
    })
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const { result } = renderHook(() => useBibleState('project-1'))

    await waitFor(() => {
      expect(result.current.isBibleLocked).toBe(true)
      expect(result.current.bibleLockedBy).toBe('editor@example.com')
    })

    act(() => {
      result.current.toggleBible()
    })

    expect(pushMock).toHaveBeenCalledWith('?bible=open')
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'bible-opened' }))
  })
})
