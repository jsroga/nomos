import { describe, expect, it } from 'vitest'
import { resolveTileImageSrc, tileBorderClassName } from '../tile-view-utils'
import { TileBorderClass } from '@/domains/2d-canvas/ui/constants/tile-view-styles'
import { cn } from '@/shared/data/utils'

describe('tile-view-utils', () => {
  describe('tileBorderClassName', () => {
    it('returns base class when idle and unselected', () => {
      const className = tileBorderClassName({
        isSelected: false,
        isGenerating: false,
        isUpscaling: false,
        isRepainting: false,
        isEnhancing: false,
      })

      expect(className).toBe(TileBorderClass.Base)
    })

    it('applies selected class when selected and not busy', () => {
      const className = tileBorderClassName({
        isSelected: true,
        isGenerating: false,
        isUpscaling: false,
        isRepainting: false,
        isEnhancing: false,
      })

      expect(className).toBe(cn(TileBorderClass.Base, TileBorderClass.Selected))
    })

    it('prioritizes busy class over selected when generating', () => {
      const className = tileBorderClassName({
        isSelected: true,
        isGenerating: true,
        isUpscaling: false,
        isRepainting: false,
        isEnhancing: false,
      })

      expect(className).toBe(cn(TileBorderClass.Base, TileBorderClass.Busy))
      expect(className).toContain('bg-gradient-to-br')
    })

    it('prioritizes busy class when upscaling', () => {
      const className = tileBorderClassName({
        isSelected: false,
        isGenerating: false,
        isUpscaling: true,
        isRepainting: false,
        isEnhancing: false,
      })

      expect(className).toBe(cn(TileBorderClass.Base, TileBorderClass.Busy))
    })

    it('prioritizes busy class when repainting', () => {
      const className = tileBorderClassName({
        isSelected: false,
        isGenerating: false,
        isUpscaling: false,
        isRepainting: true,
        isEnhancing: false,
      })

      expect(className).toBe(cn(TileBorderClass.Base, TileBorderClass.Busy))
    })

    it('prioritizes busy class when enhancing', () => {
      const className = tileBorderClassName({
        isSelected: false,
        isGenerating: false,
        isUpscaling: false,
        isRepainting: false,
        isEnhancing: true,
      })

      expect(className).toBe(cn(TileBorderClass.Base, TileBorderClass.Busy))
    })

    it('applies error class when tileError is present and tile is not busy', () => {
      const className = tileBorderClassName({
        isSelected: false,
        isGenerating: false,
        isUpscaling: false,
        isRepainting: false,
        isEnhancing: false,
        tileError: 'API Error',
      })

      expect(className).toBe(cn(TileBorderClass.Base, TileBorderClass.Error))
    })

    it('does not apply error class when tile is busy even if tileError exists', () => {
      const className = tileBorderClassName({
        isSelected: false,
        isGenerating: true,
        isUpscaling: false,
        isRepainting: false,
        isEnhancing: false,
        tileError: 'Previous Error',
      })

      expect(className).toBe(cn(TileBorderClass.Base, TileBorderClass.Busy))
      expect(className).not.toContain(TileBorderClass.Error)
    })
  })

  describe('resolveTileImageSrc', () => {
    it('returns null if filename is null, undefined, or empty', () => {
      expect(resolveTileImageSrc(null, 'proj-1', 0)).toBeNull()
      expect(resolveTileImageSrc(undefined, 'proj-1', 0)).toBeNull()
      expect(resolveTileImageSrc('', 'proj-1', 0)).toBeNull()
    })

    it('returns null if projectId is undefined', () => {
      expect(resolveTileImageSrc('tile.png', undefined, 0)).toBeNull()
    })

    it('appends cache bust query parameter for relative project image path', () => {
      const src = resolveTileImageSrc('tile_0_0.png', 'proj-123', 0)
      expect(src).toBeDefined()
      expect(src).toMatch(/^\/projects\/proj-123\/tile_0_0\.png\?t=\d+$/)
    })

    it('appends cache bust parameter for http/https absolute URLs', () => {
      const src1 = resolveTileImageSrc('https://cdn.example.com/tile.png', 'proj-123', 0)
      expect(src1).toMatch(/^https:\/\/cdn\.example\.com\/tile\.png\?t=\d+$/)

      const src2 = resolveTileImageSrc('https://cdn.example.com/tile.png?v=1', 'proj-123', 0)
      expect(src2).toMatch(/^https:\/\/cdn\.example\.com\/tile\.png\?v=1&t=\d+$/)
    })
  })
})
