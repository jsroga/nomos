import { describe, expect, it } from 'vitest'
import { GenerationMode, GENERATION_MODES } from '../generation-modes'
import { resolveGenerationModeSrefUrls } from '../../state/hooks/apply-generation-mode-srefs'
import {
  absolutePublicStyleRefUrl,
  clampStyleReferenceUrls,
  confirmGenerationModeSwitch,
  generationModePersistFields,
  generationModePresetSrefUrls,
  remainingStyleRefSlots,
  STYLE_REFERENCE_URL_MAX,
  takeStyleRefFiles,
  PAINTED_ISOMETRIC_SREF_URLS,
} from '../mj-sref'

describe('mj-sref helpers', () => {
  it('uses Disco Elysium blob URLs and does not look up public files', () => {
    expect(generationModePresetSrefUrls(GenerationMode.PaintedIsometric)).toEqual([
      ...PAINTED_ISOMETRIC_SREF_URLS,
    ])
    const mode = GENERATION_MODES.find(item => item.id === GenerationMode.PaintedIsometric)
    expect(mode).toBeDefined()
    if (!mode) return
    expect(resolveGenerationModeSrefUrls(mode)).toEqual([...PAINTED_ISOMETRIC_SREF_URLS])
    expect(generationModePresetSrefUrls(GenerationMode.PixelArt)).toEqual([])
    expect(generationModePresetSrefUrls(GenerationMode.AnimeLineart)).toEqual([])
  })

  it('leaves already-absolute blob URLs alone', () => {
    expect(
      absolutePublicStyleRefUrl(PAINTED_ISOMETRIC_SREF_URLS[0], 'https://nomos.gg'),
    ).toBe(PAINTED_ISOMETRIC_SREF_URLS[0])
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
