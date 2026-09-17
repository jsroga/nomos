import { describe, expect, it, vi, afterEach } from 'vitest'

describe('Mastra Editor on Vercel', () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('@/shared/config/env')
  })

  it('does not construct MastraEditor when VERCEL is set', async () => {
    vi.doMock('@/shared/config/env', () => ({ env: { VERCEL: '1' } }))

    const { createMastra, shouldMountMastraEditor } = await import('../create-mastra')

    expect(shouldMountMastraEditor()).toBe(false)
    expect(createMastra({}, { storage: null }).getEditor()).toBeFalsy()
  })
})
