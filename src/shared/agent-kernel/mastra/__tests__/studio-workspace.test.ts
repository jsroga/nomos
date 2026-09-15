import { describe, expect, it, vi, afterEach } from 'vitest'

describe('Studio sandbox workspace', () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('@/shared/config/env')
    vi.doUnmock('node:fs')
  })

  it('does not mkdir when VERCEL is set', async () => {
    const mkdirSync = vi.fn()
    vi.doMock('@/shared/config/env', () => ({ env: { VERCEL: '1' } }))
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
      return { ...actual, mkdirSync }
    })

    const { createInstanceStudioWorkspace, shouldCreateStudioSandbox } =
      await import('../studio-workspace')

    expect(shouldCreateStudioSandbox()).toBe(false)
    expect(createInstanceStudioWorkspace()).toBeUndefined()
    expect(mkdirSync).not.toHaveBeenCalled()
  })
})
