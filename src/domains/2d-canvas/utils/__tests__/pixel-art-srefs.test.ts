import { describe, expect, it } from 'vitest'
import {
  PIXEL_ART_SREF_DEFAULT_ENABLED,
  PixelArtSrefId,
  PixelArtSrefSetting,
  PixelArtSrefToggleStatus,
} from '../../constants/pixel-art-srefs'
import {
  defaultPixelArtSrefUrls,
  nextPixelArtEnabledIds,
  pixelArtSrefCatalogPayload,
  pixelArtSrefUrlsForIds,
  resolvePixelArtEnabledIds,
} from '../pixel-art-srefs'
import { STYLE_REFERENCE_URL_MAX } from '../mj-sref'

describe('pixel-art sref catalog', () => {
  it('defaults to the three isometric references', () => {
    expect(resolvePixelArtEnabledIds({})).toEqual([...PIXEL_ART_SREF_DEFAULT_ENABLED])
    expect(defaultPixelArtSrefUrls()).toHaveLength(STYLE_REFERENCE_URL_MAX)
    expect(defaultPixelArtSrefUrls()).toEqual(
      pixelArtSrefUrlsForIds(PIXEL_ART_SREF_DEFAULT_ENABLED),
    )
  })

  it('keeps an explicit empty admin set', () => {
    expect(
      resolvePixelArtEnabledIds({ [PixelArtSrefSetting.EnabledIdsKey]: [] }),
    ).toEqual([])
  })

  it('drops unknown ids and clamps to the generation max', () => {
    expect(
      resolvePixelArtEnabledIds({
        [PixelArtSrefSetting.EnabledIdsKey]: [
          PixelArtSrefId.NeonGrotto,
          'not-a-ref',
          PixelArtSrefId.MudVillage,
          PixelArtSrefId.ForestCottage,
          PixelArtSrefId.TentCamp,
          PixelArtSrefId.NightTemple,
        ],
      }),
    ).toEqual([
      PixelArtSrefId.NeonGrotto,
      PixelArtSrefId.MudVillage,
      PixelArtSrefId.ForestCottage,
    ])
  })

  it('toggles a reference off and refuses a fourth on', () => {
    const on = [...PIXEL_ART_SREF_DEFAULT_ENABLED]
    expect(nextPixelArtEnabledIds(on, PixelArtSrefId.MudVillage)).toEqual({
      status: PixelArtSrefToggleStatus.Applied,
      ids: [PixelArtSrefId.ForestCottage, PixelArtSrefId.TentCamp],
    })
    expect(nextPixelArtEnabledIds(on, PixelArtSrefId.NeonGrotto)).toEqual({
      status: PixelArtSrefToggleStatus.AtLimit,
      ids: on,
    })
  })

  it('marks enabled catalog items for the admin payload', () => {
    const payload = pixelArtSrefCatalogPayload(
      [PixelArtSrefId.MudVillage, PixelArtSrefId.ForestCottage],
      true,
    )
    expect(payload.canEdit).toBe(true)
    expect(payload.items).toHaveLength(5)
    expect(payload.items.filter(item => item.enabled).map(item => item.id)).toEqual([
      PixelArtSrefId.MudVillage,
      PixelArtSrefId.ForestCottage,
    ])
  })
})
