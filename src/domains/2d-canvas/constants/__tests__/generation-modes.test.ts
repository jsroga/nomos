import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GENERATION_MODE,
  GENERATION_MODES,
  GenerationMode,
  generationModeDef,
  resolveGenerationMode,
} from '../generation-modes'

describe('generation modes', () => {
  it('catalogues all five modes', () => {
    expect(GENERATION_MODES.map(mode => mode.id)).toEqual([
      GenerationMode.PixelArt,
      GenerationMode.PaintedIsometric,
      GenerationMode.AnimeLineart,
      GenerationMode.WorldMap,
      GenerationMode.TopDownLocation,
    ])
  })

  it('defaults to painted-isometric', () => {
    expect(DEFAULT_GENERATION_MODE).toBe(GenerationMode.PaintedIsometric)
    expect(resolveGenerationMode(null)).toBe(GenerationMode.PaintedIsometric)
    expect(resolveGenerationMode(undefined)).toBe(GenerationMode.PaintedIsometric)
    expect(resolveGenerationMode('unknown')).toBe(GenerationMode.PaintedIsometric)
  })

  it('resolves stored ids', () => {
    expect(resolveGenerationMode(GenerationMode.PixelArt)).toBe(GenerationMode.PixelArt)
    expect(resolveGenerationMode('world-map')).toBe(GenerationMode.WorldMap)
  })

  it('looks up the matching definition', () => {
    expect(generationModeDef(GenerationMode.AnimeLineart).name).toBe('Anime i komiks')
  })
})
