import { describe, expect, it } from 'vitest'
import { GenerationMode, GENERATION_MODES } from '../generation-modes'
import {
  absolutePublicStyleRefUrl,
  clampStyleReferenceUrls,
  confirmGenerationModeSwitch,
  generationModePersistFields,
  mjSrefPathsThatExist,
  mjSrefPublicPath,
  remainingStyleRefSlots,
  STYLE_REFERENCE_URL_MAX,
  takeStyleRefFiles,
  MjSrefSlotFile,
} from '../mj-sref'

describe('mj-sref helpers', () => {
  it('builds public paths for each slot', () => {
    expect(mjSrefPublicPath(GenerationMode.PaintedIsometric, MjSrefSlotFile.One)).toBe(
      '/2d-canvas/mj-sref/painted-isometric/1.png',
    )
  })

  it('turns repo public paths into origin URLs and leaves blob URLs alone', () => {
    expect(
      absolutePublicStyleRefUrl(
        '/2d-canvas/mj-sref/painted-isometric/1.png',
        'https://nomos.gg/',
      ),
    ).toBe('https://nomos.gg/2d-canvas/mj-sref/painted-isometric/1.png')
    expect(
      absolutePublicStyleRefUrl(
        'https://blob.vercel-storage.com/style-refs/a.png',
        'https://nomos.gg',
      ),
    ).toBe('https://blob.vercel-storage.com/style-refs/a.png')
  })

  it('skips missing preset files', () => {
    const paths = mjSrefPathsThatExist(GenerationMode.PixelArt, path =>
      path.endsWith(MjSrefSlotFile.One),
    )
    expect(paths).toEqual(['/2d-canvas/mj-sref/pixel-art/1.png'])
  })

  it('clamps style URLs to three', () => {
    expect(
      clampStyleReferenceUrls(['a', '', 'b', 'c', 'd']),
    ).toEqual(['a', 'b', 'c'])
    expect(STYLE_REFERENCE_URL_MAX).toBe(3)
  })

  it('takes only remaining allowed files', () => {
    const files = [
      new File(['x'], 'a.png', { type: 'image/png' }),
      new File(['x'], 'b.txt', { type: 'text/plain' }),
      new File(['x'], 'c.webp', { type: 'image/webp' }),
    ]
    expect(takeStyleRefFiles(files, 1)).toHaveLength(1)
    expect(takeStyleRefFiles(files, 1)[0]?.name).toBe('a.png')
    expect(takeStyleRefFiles(files, 0)).toEqual([])
    expect(remainingStyleRefSlots(2)).toBe(1)
  })

  it('persists mode prompt, URLs, and clears stylePreset', () => {
    const mode = GENERATION_MODES.find(item => item.id === GenerationMode.AnimeLineart)
    expect(mode).toBeDefined()
    if (!mode) return
    expect(
      generationModePersistFields({
        mode,
        styleReferenceUrls: ['https://cdn.example.com/1.png', 'https://cdn.example.com/2.png'],
      }),
    ).toEqual({
      generationMode: mode.id,
      canvasMasterPrompt: mode.promptFragment,
      styleReferenceUrls: ['https://cdn.example.com/1.png', 'https://cdn.example.com/2.png'],
      stylePreset: null,
    })
  })

  it('does not apply when confirm is cancelled', async () => {
    const cancelled = await confirmGenerationModeSwitch(
      async () => false,
      'Switch generation mode?',
      'Switching to Disco Elysium replaces the master prompt and the Midjourney style images.',
    )
    expect(cancelled).toBe(false)
  })
})
