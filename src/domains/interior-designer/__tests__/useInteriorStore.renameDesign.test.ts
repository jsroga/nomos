import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInteriorStore } from '../store/useInteriorStore'

describe('useInteriorStore.renameDesign', () => {
  beforeEach(() => {
    useInteriorStore.setState({
      currentDesignId: null,
      currentDesignName: null,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    useInteriorStore.setState({
      currentDesignId: null,
      currentDesignName: null,
    })
  })

  it('sends a PATCH request to the designs API and updates the open design name from the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ name: 'Server Renamed Scene' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    useInteriorStore.setState({
      currentDesignId: 'design-1',
      currentDesignName: 'Original Scene',
    })

    await useInteriorStore.getState().renameDesign('design-1', 'Client Draft Name')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/interior-designer/designs',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(request.body))).toEqual({
      id: 'design-1',
      name: 'Client Draft Name',
    })

    expect(useInteriorStore.getState().currentDesignName).toBe('Server Renamed Scene')
  })

  it('does not overwrite the currently open design name when renaming a different design', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ name: 'Other Scene Renamed' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    useInteriorStore.setState({
      currentDesignId: 'design-1',
      currentDesignName: 'Current Scene',
    })

    await useInteriorStore.getState().renameDesign('design-2', 'Different Scene')

    expect(useInteriorStore.getState().currentDesignName).toBe('Current Scene')
  })

  it('throws the API error and preserves the current design name when the rename fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', fetchMock)

    useInteriorStore.setState({
      currentDesignId: 'design-1',
      currentDesignName: 'Current Scene',
    })

    await expect(
      useInteriorStore.getState().renameDesign('design-1', 'Blocked Rename')
    ).rejects.toThrow('Unauthorized')

    expect(useInteriorStore.getState().currentDesignName).toBe('Current Scene')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to rename design:',
      expect.any(Error)
    )
  })

  it('falls back to a generic error when the failed response body is not JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      useInteriorStore.getState().renameDesign('design-1', 'Broken Response')
    ).rejects.toThrow('Failed to rename design')
  })
})
