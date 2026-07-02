import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const updateDesignMock = vi.fn()

vi.mock('@/domains/interior-designer/io/interior-designer.api', () => ({
  interiorDesignerApi: {
    designs: {
      update: (...args: unknown[]) => updateDesignMock(...args),
      create: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    },
  },
}))

describe('useInteriorStore.renameDesign', () => {
  let useInteriorStore: typeof import('../store/useInteriorStore').useInteriorStore

  beforeAll(async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })

    ;({ useInteriorStore } = await import('../store/useInteriorStore'))
  })

  beforeEach(() => {
    updateDesignMock.mockReset()
    useInteriorStore.setState({
      currentDesignId: null,
      currentDesignName: null,
    })
  })

  it('routes a successful rename through the typed API client and updates the current design name', async () => {
    updateDesignMock.mockResolvedValue({
      id: 'design-1',
      name: 'Renamed scene',
    })
    useInteriorStore.setState({
      currentDesignId: 'design-1',
      currentDesignName: 'Old scene',
    })

    await useInteriorStore.getState().renameDesign('design-1', 'Renamed scene')

    expect(updateDesignMock).toHaveBeenCalledWith({
      id: 'design-1',
      name: 'Renamed scene',
    })
    expect(useInteriorStore.getState().currentDesignName).toBe('Renamed scene')
  })

  it('does not overwrite the currently open design name when renaming a different design', async () => {
    updateDesignMock.mockResolvedValue({
      id: 'design-1',
      name: 'Renamed elsewhere',
    })
    useInteriorStore.setState({
      currentDesignId: 'design-2',
      currentDesignName: 'Current scene',
    })

    await useInteriorStore.getState().renameDesign('design-1', 'Renamed elsewhere')

    expect(useInteriorStore.getState().currentDesignName).toBe('Current scene')
  })

  it('surfaces rename failures and preserves the current design name', async () => {
    updateDesignMock.mockRejectedValue(new Error('Rename failed'))
    useInteriorStore.setState({
      currentDesignId: 'design-1',
      currentDesignName: 'Old scene',
    })

    await expect(
      useInteriorStore.getState().renameDesign('design-1', 'Renamed scene')
    ).rejects.toThrow('Rename failed')
    expect(useInteriorStore.getState().currentDesignName).toBe('Old scene')
  })
})
