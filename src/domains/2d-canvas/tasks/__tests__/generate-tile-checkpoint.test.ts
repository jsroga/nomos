import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GenerateTilePayload } from '../constants/generate-tile'
import type { GenerateTileRunDeps } from '../generate-tile-run'

vi.mock('@trigger.dev/sdk', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  metadata: {
    current: () => ({}),
    set: vi.fn(async () => undefined),
  },
}))

vi.mock('@/shared/ai/ai-provider-config', () => ({
  aiProviderConfigFromRecord: () => ({ provider: 'gemini' }),
}))

vi.mock('../constants/generate-tile-persist', () => ({
  extractContextImageBase64: () => undefined,
  assembleServerContextImage: vi.fn(),
  createSupabaseServiceClient: () => ({}),
  resolveOriginalTileUrl: vi.fn(async () => undefined),
  uploadTileToBlob: vi.fn(),
  requireBlobToken: () => 'token',
}))

import { runGenerateTile } from '../generate-tile-run'

const PROJECT_ID = '11111111-1111-4111-8111-111111111111'
const IMAGE_BASE64 = 'dGlsZQ=='

function payload(): GenerateTilePayload {
  return {
    projectId: PROJECT_ID,
    requestId: 'nonce-1',
    x: 1,
    y: 2,
    prompt: 'meadow',
    aiProvider: 'gemini',
    aiConfig: {},
    isFirstTile: true,
  }
}

function makeDeps(overrides: Partial<GenerateTileRunDeps> = {}): {
  deps: GenerateTileRunDeps
  generateTileImage: ReturnType<typeof vi.fn>
} {
  let scratchUrl: string | undefined
  const generateTileImage = vi.fn(async () => IMAGE_BASE64)
  const deps: GenerateTileRunDeps = {
    generateTileImage,
    uploadScratch: vi.fn(async () => 'https://blob.example/scratch.png'),
    readScratchUrl: () => scratchUrl,
    writeScratchUrl: async url => {
      scratchUrl = url
    },
    downloadScratch: vi.fn(async () => IMAGE_BASE64),
    uploadFinal: vi.fn(async () => ({
      filename: 'tiles/final.png',
      newUrl: 'https://blob.example/final.png',
    })),
    ...overrides,
  }
  return { deps, generateTileImage }
}

describe('generate-tile checkpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips generateTileImage on retry when scratch is already uploaded', async () => {
    let persistShouldFail = true
    const persistError = new Error('persist failed')
    const { deps, generateTileImage } = makeDeps({
      uploadFinal: vi.fn(async () => {
        if (persistShouldFail) throw persistError
        return { filename: 'tiles/final.png', newUrl: 'https://blob.example/final.png' }
      }),
    })

    await expect(runGenerateTile(payload(), deps)).rejects.toBe(persistError)
    expect(generateTileImage).toHaveBeenCalledTimes(1)

    persistShouldFail = false
    await runGenerateTile(payload(), deps)
    expect(generateTileImage).toHaveBeenCalledTimes(1)
    expect(deps.downloadScratch).toHaveBeenCalledTimes(1)
  })

  it('regenerates when generate succeeds but scratch upload has not landed', async () => {
    const scratchError = new Error('scratch put failed')
    const generateTileImage = vi.fn(async () => IMAGE_BASE64)
    const first = makeDeps({
      generateTileImage,
      uploadScratch: vi.fn(async () => {
        throw scratchError
      }),
    })

    await expect(runGenerateTile(payload(), first.deps)).rejects.toBe(scratchError)
    expect(generateTileImage).toHaveBeenCalledTimes(1)

    const second = makeDeps({ generateTileImage })
    await runGenerateTile(payload(), second.deps)
    expect(generateTileImage).toHaveBeenCalledTimes(2)
  })

  it('does not generate when generateTileImage throws before returning bytes', async () => {
    const generateError = new Error('provider failed')
    const generateTileImage = vi.fn(async () => {
      throw generateError
    })
    const first = makeDeps({ generateTileImage })

    await expect(runGenerateTile(payload(), first.deps)).rejects.toBe(generateError)
    expect(generateTileImage).toHaveBeenCalledTimes(1)
  })
})
