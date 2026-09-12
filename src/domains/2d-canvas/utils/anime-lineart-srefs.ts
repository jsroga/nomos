import {
  ANIME_LINEART_SREF_CATALOG,
  ANIME_LINEART_SREF_DEFAULT_ENABLED,
  AnimeLineartSrefId,
  AnimeLineartSrefSetting,
} from '../constants/anime-lineart-srefs'
import { StyleRefCatalogToggleStatus } from '../constants/style-ref-catalog'
import {
  catalogPayload,
  catalogUrlsForIds,
  nextCatalogEnabledIds,
  resolveCatalogEnabledIds,
  uniqueCatalogIds,
} from './style-ref-catalog'

const ANIME_LINEART_SREF_ID_SET = new Set<string>(Object.values(AnimeLineartSrefId))

export function isAnimeLineartSrefId(value: string): value is AnimeLineartSrefId {
  return ANIME_LINEART_SREF_ID_SET.has(value)
}

export function uniqueAnimeLineartSrefIds(ids: readonly string[]): AnimeLineartSrefId[] {
  return uniqueCatalogIds(ANIME_LINEART_SREF_ID_SET, ids).flatMap(id =>
    isAnimeLineartSrefId(id) ? [id] : [],
  )
}

export function resolveAnimeLineartEnabledIds(
  config: Record<string, unknown>,
): AnimeLineartSrefId[] {
  return uniqueAnimeLineartSrefIds(
    resolveCatalogEnabledIds(
      ANIME_LINEART_SREF_ID_SET,
      ANIME_LINEART_SREF_DEFAULT_ENABLED,
      config,
      AnimeLineartSrefSetting.EnabledIdsKey,
    ),
  )
}

export function animeLineartSrefUrlsForIds(ids: readonly string[]): string[] {
  return catalogUrlsForIds(ANIME_LINEART_SREF_CATALOG, ids)
}

export function defaultAnimeLineartSrefUrls(): string[] {
  return animeLineartSrefUrlsForIds(ANIME_LINEART_SREF_DEFAULT_ENABLED)
}

export function nextAnimeLineartEnabledIds(
  current: readonly string[],
  id: string,
): { status: StyleRefCatalogToggleStatus; ids: AnimeLineartSrefId[] } {
  const next = nextCatalogEnabledIds(ANIME_LINEART_SREF_ID_SET, current, id)
  return { status: next.status, ids: uniqueAnimeLineartSrefIds(next.ids) }
}

export function animeLineartSrefCatalogPayload(
  enabledIds: readonly string[],
  canEdit: boolean,
) {
  return catalogPayload(ANIME_LINEART_SREF_CATALOG, enabledIds, canEdit)
}
