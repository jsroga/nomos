import {
  PIXEL_ART_SREF_CATALOG,
  PIXEL_ART_SREF_DEFAULT_ENABLED,
  PixelArtSrefId,
  PixelArtSrefSetting,
  PixelArtSrefToggleStatus,
} from '../constants/pixel-art-srefs'
import {
  catalogPayload,
  catalogUrlsForIds,
  nextCatalogEnabledIds,
  parseStyleRefCatalog,
  resolveCatalogEnabledIds,
  uniqueCatalogIds,
  type StyleRefCatalogItem,
} from './style-ref-catalog'

const PIXEL_ART_SREF_ID_SET = new Set<string>(Object.values(PixelArtSrefId))

export type PixelArtSrefCatalogItem = StyleRefCatalogItem & { id: PixelArtSrefId }

export function isPixelArtSrefId(value: string): value is PixelArtSrefId {
  return PIXEL_ART_SREF_ID_SET.has(value)
}

export function uniquePixelArtSrefIds(ids: readonly string[]): PixelArtSrefId[] {
  return uniqueCatalogIds(PIXEL_ART_SREF_ID_SET, ids).flatMap(id =>
    isPixelArtSrefId(id) ? [id] : [],
  )
}

export function resolvePixelArtEnabledIds(config: Record<string, unknown>): PixelArtSrefId[] {
  return uniquePixelArtSrefIds(
    resolveCatalogEnabledIds(
      PIXEL_ART_SREF_ID_SET,
      PIXEL_ART_SREF_DEFAULT_ENABLED,
      config,
      PixelArtSrefSetting.EnabledIdsKey,
    ),
  )
}

export function pixelArtSrefUrlsForIds(ids: readonly string[]): string[] {
  return catalogUrlsForIds(PIXEL_ART_SREF_CATALOG, ids)
}

export function defaultPixelArtSrefUrls(): string[] {
  return pixelArtSrefUrlsForIds(PIXEL_ART_SREF_DEFAULT_ENABLED)
}

export function nextPixelArtEnabledIds(
  current: readonly string[],
  id: string,
): { status: PixelArtSrefToggleStatus; ids: PixelArtSrefId[] } {
  const next = nextCatalogEnabledIds(PIXEL_ART_SREF_ID_SET, current, id)
  return { status: next.status, ids: uniquePixelArtSrefIds(next.ids) }
}

export function pixelArtSrefCatalogPayload(
  enabledIds: readonly string[],
  canEdit: boolean,
): { items: PixelArtSrefCatalogItem[]; canEdit: boolean } {
  const payload = catalogPayload(PIXEL_ART_SREF_CATALOG, enabledIds, canEdit)
  return {
    canEdit: payload.canEdit,
    items: payload.items.flatMap(item =>
      isPixelArtSrefId(item.id) ? [{ ...item, id: item.id }] : [],
    ),
  }
}

export function parsePixelArtSrefCatalog(value: Record<string, unknown>): {
  items: PixelArtSrefCatalogItem[]
  canEdit: boolean
} {
  const parsed = parseStyleRefCatalog(
    PIXEL_ART_SREF_CATALOG,
    PIXEL_ART_SREF_DEFAULT_ENABLED,
    value,
  )
  return {
    canEdit: parsed.canEdit,
    items: parsed.items.flatMap(item =>
      isPixelArtSrefId(item.id) ? [{ ...item, id: item.id }] : [],
    ),
  }
}
