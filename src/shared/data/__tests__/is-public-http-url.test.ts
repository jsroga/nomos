import { describe, expect, it } from 'vitest'
import { isPublicHttpUrl } from '@/shared/data/is-public-http-url'

describe('isPublicHttpUrl', () => {
  it('accepts a public https Blob URL', () => {
    expect(
      isPublicHttpUrl('https://abc.public.blob.vercel-storage.com/assets/proj/cutout.png'),
    ).toBe(true)
  })

  it('rejects a relative project path', () => {
    expect(isPublicHttpUrl('/projects/proj/assets/cutout.png')).toBe(false)
  })

  it('rejects a data URI', () => {
    expect(isPublicHttpUrl('data:image/png;base64,AA==')).toBe(false)
  })

  it('rejects localhost and loopback hosts', () => {
    expect(isPublicHttpUrl('http://localhost:3000/projects/p/assets/a.png')).toBe(false)
    expect(isPublicHttpUrl('http://127.0.0.1/cutout.png')).toBe(false)
    expect(isPublicHttpUrl('http://[::1]/cutout.png')).toBe(false)
  })

  it('rejects empty and invalid values', () => {
    expect(isPublicHttpUrl('')).toBe(false)
    expect(isPublicHttpUrl('not-a-url')).toBe(false)
  })
})
