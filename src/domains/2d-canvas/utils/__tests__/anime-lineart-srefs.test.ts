import { describe, expect, it } from 'vitest'
import {
  ANIME_LINEART_SREF_DEFAULT_ENABLED,
  AnimeLineartSrefId,
  AnimeLineartSrefSetting,
} from '../../constants/anime-lineart-srefs'
import { StyleRefCatalogToggleStatus } from '../../constants/style-ref-catalog'
import { GenerationMode } from '../generation-modes'
import { STYLE_REFERENCE_URL_MAX } from '../mj-sref'
import {
  animeLineartSrefCatalogPayload,
  animeLineartSrefUrlsForIds,
  defaultAnimeLineartSrefUrls,
  nextAnimeLineartEnabledIds,
  resolveAnimeLineartEnabledIds,
} from '../anime-lineart-srefs'
import { catalogModeFromRaw, hasStyleRefCatalog } from '../style-ref-catalog'

describe('anime-lineart sref catalog', () => {
  it('defaults to three anime and comics references', () => {
    expect(resolveAnimeLineartEnabledIds({})).toEqual([...ANIME_LINEART_SREF_DEFAULT_ENABLED])
    expect(defaultAnimeLineartSrefUrls()).toHaveLength(STYLE_REFERENCE_URL_MAX)
    expect(defaultAnimeLineartSrefUrls()).toEqual(
      animeLineartSrefUrlsForIds(ANIME_LINEART_SREF_DEFAULT_ENABLED),
    )
  })

  it('keeps an explicit empty admin set', () => {
    expect(
      resolveAnimeLineartEnabledIds({ [AnimeLineartSrefSetting.EnabledIdsKey]: [] }),
    ).toEqual([])
  })

  it('drops unknown ids and clamps to the generation max', () => {
    expect(
      resolveAnimeLineartEnabledIds({
        [AnimeLineartSrefSetting.EnabledIdsKey]: [
          AnimeLineartSrefId.CoralCave,
          'not-a-ref',
          AnimeLineartSrefId.ActionPages,
          AnimeLineartSrefId.SalonPages,
          AnimeLineartSrefId.InkAtrium,
          AnimeLineartSrefId.MangaPages,
        ],
      }),
    ).toEqual([
      AnimeLineartSrefId.CoralCave,
      AnimeLineartSrefId.ActionPages,
      AnimeLineartSrefId.SalonPages,
    ])
  })

  it('toggles a reference off and refuses a fourth on', () => {
    const on = [...ANIME_LINEART_SREF_DEFAULT_ENABLED]
    expect(nextAnimeLineartEnabledIds(on, AnimeLineartSrefId.ActionPages)).toEqual({
      status: StyleRefCatalogToggleStatus.Applied,
      ids: [AnimeLineartSrefId.CoralCave, AnimeLineartSrefId.SalonPages],
    })
    expect(nextAnimeLineartEnabledIds(on, AnimeLineartSrefId.MangaPages)).toEqual({
      status: StyleRefCatalogToggleStatus.AtLimit,
      ids: on,
    })
  })

  it('marks enabled catalog items for the admin payload', () => {
    const payload = animeLineartSrefCatalogPayload(
      [AnimeLineartSrefId.CoralCave, AnimeLineartSrefId.ActionPages],
      true,
    )
    expect(payload.canEdit).toBe(true)
    expect(payload.items).toHaveLength(5)
    expect(payload.items.filter(item => item.enabled).map(item => item.id)).toEqual([
      AnimeLineartSrefId.CoralCave,
      AnimeLineartSrefId.ActionPages,
    ])
  })

  it('registers Anime and comics as a catalog mode', () => {
    expect(hasStyleRefCatalog(GenerationMode.AnimeLineart)).toBe(true)
    expect(catalogModeFromRaw(GenerationMode.AnimeLineart)).toBe(GenerationMode.AnimeLineart)
  })
})
