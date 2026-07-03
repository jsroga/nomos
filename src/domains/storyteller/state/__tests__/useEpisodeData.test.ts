/**
 * @vitest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocalStorageKeys } from '@/constants/localStorage'
import { useEpisodeData } from '../useEpisodeData'

const pushMock = vi.fn()
const useEpisodesMock = vi.fn()
const useEpisodeMock = vi.fn()

let searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/domains/storyteller/state/queries/useEpisodes', () => ({
  useEpisodes: (projectId: string | undefined) => useEpisodesMock(projectId),
  useEpisode: (episodeId: string | null | undefined) => useEpisodeMock(episodeId),
}))

describe('useEpisodeData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    searchParams = new URLSearchParams()

    useEpisodesMock.mockReturnValue({ data: [] })
    useEpisodeMock.mockReturnValue({ data: null })
  })

  it('prefers the localStorage override when forcing the has-episodes state', async () => {
    localStorage.setItem(LocalStorageKeys.FORCE_STORYTELLER_STATE, 'HAS_EPISODES')

    const { result } = renderHook(() => useEpisodeData('project-1'))

    await waitFor(() => {
      expect(result.current.overrideState).toBe('HAS_EPISODES')
      expect(result.current.hasEpisodes).toBe(true)
    })

    expect(result.current.firstEpisodeId).toBeNull()
  })

  it('hydrates the selected episode and pushes a new episodeId when selecting another episode', async () => {
    searchParams = new URLSearchParams('episodeId=ep-1')

    useEpisodesMock.mockReturnValue({
      data: [
        { id: 'ep-1', title: 'Pilot', sequence: 1 },
        { id: 'ep-2', title: 'Finale', sequence: 2 },
      ],
    })
    useEpisodeMock.mockReturnValue({
      data: {
        id: 'ep-1',
        title: 'Pilot',
        masterPrompt: 'Write cinematically',
        episode_prompt: 'Write cinematically',
      },
    })

    const { result } = renderHook(() => useEpisodeData('project-1'))

    await waitFor(() => {
      expect(result.current.currentEpisodeId).toBe('ep-1')
      expect(result.current.currentEpisodeTitle).toBe('Pilot')
      expect(result.current.firstEpisodeId).toBe('ep-1')
      expect(result.current.hasEpisodes).toBe(true)
    })

    act(() => {
      result.current.selectEpisode('ep-2')
    })

    expect(pushMock).toHaveBeenCalledWith('?episodeId=ep-2')
    expect(result.current.currentEpisodeId).toBe('ep-2')
  })
})
