import { describe, expect, it } from 'vitest'
import {
  LOCATION_MAP_SREF_DEFAULT_ENABLED,
  LocationMapSrefId,
  LocationMapSrefSetting,
} from '../../constants/location-map-srefs'
import { StyleRefCatalogToggleStatus } from '../../constants/style-ref-catalog'
import { GenerationMode } from '../generation-modes'
import { STYLE_REFERENCE_URL_MAX } from '../mj-sref'
import {
  defaultLocationMapSrefUrls,
  locationMapSrefCatalogPayload,
  locationMapSrefUrlsForIds,
  nextLocationMapEnabledIds,
  resolveLocationMapEnabledIds,
} from '../location-map-srefs'
import { catalogModeFromRaw, hasStyleRefCatalog } from '../style-ref-catalog'

describe('location-map sref catalog', () => {
  it('defaults to three location-map references', () => {
    expect(resolveLocationMapEnabledIds({})).toEqual([...LOCATION_MAP_SREF_DEFAULT_ENABLED])
    expect(defaultLocationMapSrefUrls()).toHaveLength(STYLE_REFERENCE_URL_MAX)
    expect(defaultLocationMapSrefUrls()).toEqual(
      locationMapSrefUrlsForIds(LOCATION_MAP_SREF_DEFAULT_ENABLED),
    )
  })

  it('keeps an explicit empty admin set', () => {
    expect(
      resolveLocationMapEnabledIds({ [LocationMapSrefSetting.EnabledIdsKey]: [] }),
    ).toEqual([])
  })

  it('drops unknown ids and clamps to the generation max', () => {
    expect(
      resolveLocationMapEnabledIds({
        [LocationMapSrefSetting.EnabledIdsKey]: [
          LocationMapSrefId.ParchmentWilds,
          'not-a-ref',
          LocationMapSrefId.HarborCity,
          LocationMapSrefId.NamedKingdoms,
          LocationMapSrefId.ColoredKingdoms,
        ],
      }),
    ).toEqual([
      LocationMapSrefId.ParchmentWilds,
      LocationMapSrefId.HarborCity,
      LocationMapSrefId.NamedKingdoms,
    ])
  })

  it('toggles a reference off and refuses a fourth on', () => {
    const on = [...LOCATION_MAP_SREF_DEFAULT_ENABLED]
    expect(nextLocationMapEnabledIds(on, LocationMapSrefId.HarborCity)).toEqual({
      status: StyleRefCatalogToggleStatus.Applied,
      ids: [LocationMapSrefId.ParchmentWilds, LocationMapSrefId.NamedKingdoms],
    })
    expect(nextLocationMapEnabledIds(on, LocationMapSrefId.ColoredKingdoms)).toEqual({
      status: StyleRefCatalogToggleStatus.AtLimit,
      ids: on,
    })
  })

  it('marks enabled catalog items for the admin payload', () => {
    const payload = locationMapSrefCatalogPayload(
      [LocationMapSrefId.ParchmentWilds, LocationMapSrefId.HarborCity],
      true,
    )
    expect(payload.canEdit).toBe(true)
    expect(payload.items).toHaveLength(4)
    expect(payload.items.filter(item => item.enabled).map(item => item.id)).toEqual([
      LocationMapSrefId.ParchmentWilds,
      LocationMapSrefId.HarborCity,
    ])
  })

  it('registers Location map as a catalog mode', () => {
    expect(hasStyleRefCatalog(GenerationMode.TopDownLocation)).toBe(true)
    expect(hasStyleRefCatalog(GenerationMode.PixelArt)).toBe(true)
    expect(hasStyleRefCatalog(GenerationMode.AnimeLineart)).toBe(true)
    expect(hasStyleRefCatalog(GenerationMode.PaintedIsometric)).toBe(true)
    expect(hasStyleRefCatalog(GenerationMode.WorldMap)).toBe(false)
    expect(catalogModeFromRaw(GenerationMode.TopDownLocation)).toBe(
      GenerationMode.TopDownLocation,
    )
    expect(catalogModeFromRaw(GenerationMode.WorldMap)).toBeUndefined()
  })
})
