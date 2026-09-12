import { describe, expect, it } from 'vitest'
import {
  PAINTED_ISOMETRIC_SREF_DEFAULT_ENABLED,
  PaintedIsometricSrefId,
  PaintedIsometricSrefSetting,
} from '../../constants/painted-isometric-srefs'
import { StyleRefCatalogToggleStatus } from '../../constants/style-ref-catalog'
import { GenerationMode } from '../generation-modes'
import { STYLE_REFERENCE_URL_MAX } from '../mj-sref'
import {
  defaultPaintedIsometricSrefUrls,
  nextPaintedIsometricEnabledIds,
  paintedIsometricSrefCatalogPayload,
  paintedIsometricSrefUrlsForIds,
  resolvePaintedIsometricEnabledIds,
} from '../painted-isometric-srefs'
import { catalogModeFromRaw, hasStyleRefCatalog } from '../style-ref-catalog'

describe('painted-isometric sref catalog', () => {
  it('defaults to the three original Disco Elysium references', () => {
    expect(resolvePaintedIsometricEnabledIds({})).toEqual([
      ...PAINTED_ISOMETRIC_SREF_DEFAULT_ENABLED,
    ])
    expect(defaultPaintedIsometricSrefUrls()).toHaveLength(STYLE_REFERENCE_URL_MAX)
    expect(defaultPaintedIsometricSrefUrls()).toEqual(
      paintedIsometricSrefUrlsForIds(PAINTED_ISOMETRIC_SREF_DEFAULT_ENABLED),
    )
  })

  it('keeps an explicit empty admin set', () => {
    expect(
      resolvePaintedIsometricEnabledIds({ [PaintedIsometricSrefSetting.EnabledIdsKey]: [] }),
    ).toEqual([])
  })

  it('drops unknown ids and clamps to the generation max', () => {
    expect(
      resolvePaintedIsometricEnabledIds({
        [PaintedIsometricSrefSetting.EnabledIdsKey]: [
          PaintedIsometricSrefId.HarborTown,
          'not-a-ref',
          PaintedIsometricSrefId.One,
          PaintedIsometricSrefId.Two,
          PaintedIsometricSrefId.Three,
          PaintedIsometricSrefId.DustyCourtyard,
        ],
      }),
    ).toEqual([
      PaintedIsometricSrefId.HarborTown,
      PaintedIsometricSrefId.One,
      PaintedIsometricSrefId.Two,
    ])
  })

  it('toggles a reference off and refuses a fourth on', () => {
    const on = [...PAINTED_ISOMETRIC_SREF_DEFAULT_ENABLED]
    expect(nextPaintedIsometricEnabledIds(on, PaintedIsometricSrefId.Two)).toEqual({
      status: StyleRefCatalogToggleStatus.Applied,
      ids: [PaintedIsometricSrefId.One, PaintedIsometricSrefId.Three],
    })
    expect(nextPaintedIsometricEnabledIds(on, PaintedIsometricSrefId.HarborTown)).toEqual({
      status: StyleRefCatalogToggleStatus.AtLimit,
      ids: on,
    })
  })

  it('marks enabled catalog items for the admin payload', () => {
    const payload = paintedIsometricSrefCatalogPayload(
      [PaintedIsometricSrefId.One, PaintedIsometricSrefId.HarborTown],
      true,
    )
    expect(payload.canEdit).toBe(true)
    expect(payload.items).toHaveLength(5)
    expect(payload.items.filter(item => item.enabled).map(item => item.id)).toEqual([
      PaintedIsometricSrefId.One,
      PaintedIsometricSrefId.HarborTown,
    ])
  })

  it('registers Disco Elysium as a catalog mode', () => {
    expect(hasStyleRefCatalog(GenerationMode.PaintedIsometric)).toBe(true)
    expect(catalogModeFromRaw(GenerationMode.PaintedIsometric)).toBe(
      GenerationMode.PaintedIsometric,
    )
  })
})
