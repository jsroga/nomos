import { describe, expect, it } from 'vitest'
import { TileNeighborEdge } from '@/shared/data/server/constants/generation-prompts'
import {
  neighborImageUrlsFromSides,
  orderedNeighborEdges,
  orderedNeighborHttpsUrls,
} from '../neighbor-image-urls'

const LEFT = 'https://cdn.example.com/left.png'
const STYLE = 'https://cdn.example.com/sref.png'

describe('neighborImageUrlsFromSides', () => {
  it('keeps http(s) cardinal neighbors and drops data URLs', () => {
    const urls = neighborImageUrlsFromSides({
      left: LEFT,
      right: 'data:image/png;base64,aaa',
      up: '/projects/x/tile.png',
    })
    expect(orderedNeighborHttpsUrls(urls)).toEqual([LEFT])
    expect(orderedNeighborEdges(urls)).toEqual([TileNeighborEdge.Left])
  })

  it('orders left before right before up before down', () => {
    const urls = neighborImageUrlsFromSides({
      down: 'https://cdn.example.com/down.png',
      left: LEFT,
      up: 'https://cdn.example.com/up.png',
    })
    expect(orderedNeighborHttpsUrls(urls)).toEqual([
      LEFT,
      'https://cdn.example.com/up.png',
      'https://cdn.example.com/down.png',
    ])
    expect(orderedNeighborHttpsUrls(urls)).not.toContain(STYLE)
  })
})
