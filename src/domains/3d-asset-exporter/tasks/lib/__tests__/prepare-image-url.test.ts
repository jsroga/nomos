import { describe, expect, it, vi } from 'vitest'
import { PrepareImageError } from '../../constants/meshy-generation-wire'
import { prepareImageUrl } from '../prepare-image-url'

vi.mock('@trigger.dev/sdk', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/shared/auth/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/shared/data/storage/storage-service', () => ({
  storageService: { uploadPublicFile: vi.fn() },
}))

const BLOB_URL = 'https://abc.public.blob.vercel-storage.com/assets/cutout.png'
const DATA_URI = 'data:image/png;base64,AA=='
const LOCAL_PATH = '/projects/proj/assets/cutout.png'

describe('prepareImageUrl', () => {
  it('passes through a public https URL', async () => {
    const upload = vi.fn()
    await expect(prepareImageUrl(BLOB_URL, 'asset-1', { upload })).resolves.toBe(BLOB_URL)
    expect(upload).not.toHaveBeenCalled()
  })

  it('uploads a data URI and returns the Blob URL', async () => {
    const upload = vi.fn(async () => BLOB_URL)
    await expect(prepareImageUrl(DATA_URI, 'asset-1', { upload })).resolves.toBe(BLOB_URL)
    expect(upload).toHaveBeenCalled()
  })

  it('uploads a local project file instead of inlining a data URI', async () => {
    const upload = vi.fn(async () => BLOB_URL)
    const result = await prepareImageUrl(LOCAL_PATH, 'asset-1', {
      upload,
      readLocalFile: async () => Buffer.from('png-bytes'),
    })
    expect(result).toBe(BLOB_URL)
    expect(result.startsWith('data:')).toBe(false)
    expect(upload).toHaveBeenCalled()
  })

  it('throws when a local project file is missing', async () => {
    await expect(
      prepareImageUrl(LOCAL_PATH, 'asset-1', {
        readLocalFile: async () => {
          throw new Error(`${PrepareImageError.NotFoundPrefix} ${LOCAL_PATH}`)
        },
      }),
    ).rejects.toThrow(PrepareImageError.NotFoundPrefix)
  })

  it('throws when the input is not a public URL and has no bytes', async () => {
    await expect(prepareImageUrl('asset_1.png')).rejects.toThrow(PrepareImageError.NotPublic)
  })

  it('returns the Blob URL when DB persist fails', async () => {
    const result = await prepareImageUrl(DATA_URI, 'asset-1', {
      upload: async () => BLOB_URL,
      persistAssetUrl: async () => {
        throw new Error('db')
      },
    })
    expect(result).toBe(BLOB_URL)
  })
})
