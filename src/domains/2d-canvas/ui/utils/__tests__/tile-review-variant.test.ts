import { describe, expect, it } from 'vitest'
import { findVariantIndex } from '../tile-review-variant'

describe('tile-review-variant', () => {
  describe('findVariantIndex', () => {
    it('finds exact matching URL in variant list', () => {
      const variantUrls = [
        'https://cdn.example.com/v0.png',
        'https://cdn.example.com/v1.png',
        'https://cdn.example.com/v2.png',
        'https://cdn.example.com/v3.png',
      ]

      expect(findVariantIndex(variantUrls, 'https://cdn.example.com/v2.png')).toBe(2)
      expect(findVariantIndex(variantUrls, 'https://cdn.example.com/v0.png')).toBe(0)
    })

    it('matches URLs ignoring query string differences', () => {
      const variantUrls = [
        'https://cdn.example.com/v0.png?sig=abc',
        'https://cdn.example.com/v1.png?sig=def',
      ]

      expect(findVariantIndex(variantUrls, 'https://cdn.example.com/v1.png?sig=different_sig')).toBe(1)
      expect(findVariantIndex(variantUrls, 'https://cdn.example.com/v0.png')).toBe(0)
    })

    it('returns -1 when selected URL is not in list', () => {
      const variantUrls = ['https://cdn.example.com/v0.png', 'https://cdn.example.com/v1.png']

      expect(findVariantIndex(variantUrls, 'https://cdn.example.com/v99.png')).toBe(-1)
      expect(findVariantIndex([], 'https://cdn.example.com/v0.png')).toBe(-1)
    })
  })
})
