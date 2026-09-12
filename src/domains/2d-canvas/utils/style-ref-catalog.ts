import { recordFromJson, readString, stringArrayFromJson } from '@/shared/data/json-guards'
import {
  ANIME_LINEART_SREF_CATALOG,
  ANIME_LINEART_SREF_DEFAULT_ENABLED,
  AnimeLineartSrefSetting,
} from '../constants/anime-lineart-srefs'
import {
  LOCATION_MAP_SREF_CATALOG,
  LOCATION_MAP_SREF_DEFAULT_ENABLED,
  LocationMapSrefSetting,
} from '../constants/location-map-srefs'
import {
  PAINTED_ISOMETRIC_SREF_CATALOG,
  PAINTED_ISOMETRIC_SREF_DEFAULT_ENABLED,
  PaintedIsometricSrefSetting,
} from '../constants/painted-isometric-srefs'
import {
  PIXEL_ART_SREF_CATALOG,
  PIXEL_ART_SREF_DEFAULT_ENABLED,
  PixelArtSrefSetting,
} from '../constants/pixel-art-srefs'
import {
  StyleRefCatalogBodyKey,
  StyleRefCatalogToggleStatus,
} from '../constants/style-ref-catalog'
import { GenerationMode } from './generation-modes'
import { clampStyleReferenceUrls, STYLE_REFERENCE_URL_MAX } from './mj-sref'

export interface StyleRefCatalogEntry {
  id: string
  url: string
  label: string
}

export interface StyleRefCatalogItem extends StyleRefCatalogEntry {
  enabled: boolean
}

export interface StyleRefCatalogDef {
  mode: GenerationMode
  moduleKey: string
  enabledIdsKey: string
  entries: readonly StyleRefCatalogEntry[]
  defaultEnabled: readonly string[]
}

export const STYLE_REF_CATALOG_DEFS: readonly StyleRefCatalogDef[] = [
  {
    mode: GenerationMode.PixelArt,
    moduleKey: PixelArtSrefSetting.ModuleKey,
    enabledIdsKey: PixelArtSrefSetting.EnabledIdsKey,
    entries: PIXEL_ART_SREF_CATALOG,
    defaultEnabled: PIXEL_ART_SREF_DEFAULT_ENABLED,
  },
  {
    mode: GenerationMode.TopDownLocation,
    moduleKey: LocationMapSrefSetting.ModuleKey,
    enabledIdsKey: LocationMapSrefSetting.EnabledIdsKey,
    entries: LOCATION_MAP_SREF_CATALOG,
    defaultEnabled: LOCATION_MAP_SREF_DEFAULT_ENABLED,
  },
  {
    mode: GenerationMode.AnimeLineart,
    moduleKey: AnimeLineartSrefSetting.ModuleKey,
    enabledIdsKey: AnimeLineartSrefSetting.EnabledIdsKey,
    entries: ANIME_LINEART_SREF_CATALOG,
    defaultEnabled: ANIME_LINEART_SREF_DEFAULT_ENABLED,
  },
  {
    mode: GenerationMode.PaintedIsometric,
    moduleKey: PaintedIsometricSrefSetting.ModuleKey,
    enabledIdsKey: PaintedIsometricSrefSetting.EnabledIdsKey,
    entries: PAINTED_ISOMETRIC_SREF_CATALOG,
    defaultEnabled: PAINTED_ISOMETRIC_SREF_DEFAULT_ENABLED,
  },
]

export function styleRefCatalogDef(mode: GenerationMode): StyleRefCatalogDef | undefined {
  for (const def of STYLE_REF_CATALOG_DEFS) {
    if (def.mode === mode) return def
  }
  return undefined
}

export function styleRefCatalogModes(): GenerationMode[] {
  return STYLE_REF_CATALOG_DEFS.map(def => def.mode)
}

export function hasStyleRefCatalog(mode: GenerationMode): boolean {
  return styleRefCatalogDef(mode) !== undefined
}

export function catalogModeFromRaw(
  value: string | null | undefined,
): GenerationMode | undefined {
  if (!value) return undefined
  for (const def of STYLE_REF_CATALOG_DEFS) {
    if (def.mode === value) return def.mode
  }
  return undefined
}

export function catalogIdSet(entries: readonly StyleRefCatalogEntry[]): Set<string> {
  return new Set(entries.map(item => item.id))
}

export function uniqueCatalogIds(
  allowed: ReadonlySet<string>,
  ids: readonly string[],
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    if (!allowed.has(id) || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

export function resolveCatalogEnabledIds(
  allowed: ReadonlySet<string>,
  defaultEnabled: readonly string[],
  config: Record<string, unknown>,
  enabledIdsKey: string,
): string[] {
  if (!(enabledIdsKey in config)) {
    return [...defaultEnabled]
  }
  return uniqueCatalogIds(allowed, stringArrayFromJson(config[enabledIdsKey])).slice(
    0,
    STYLE_REFERENCE_URL_MAX,
  )
}

export function catalogUrlsForIds(
  entries: readonly StyleRefCatalogEntry[],
  ids: readonly string[],
): string[] {
  const byId = new Map(entries.map(item => [item.id, item.url]))
  const urls: string[] = []
  for (const id of uniqueCatalogIds(catalogIdSet(entries), ids)) {
    const url = byId.get(id)
    if (url) urls.push(url)
  }
  return clampStyleReferenceUrls(urls)
}

export function defaultStyleRefCatalogUrls(mode: GenerationMode): string[] {
  const def = styleRefCatalogDef(mode)
  if (!def) return []
  return catalogUrlsForIds(def.entries, def.defaultEnabled)
}

export function nextCatalogEnabledIds(
  allowed: ReadonlySet<string>,
  current: readonly string[],
  id: string,
): { status: StyleRefCatalogToggleStatus; ids: string[] } {
  if (!allowed.has(id)) {
    return { status: StyleRefCatalogToggleStatus.Unknown, ids: uniqueCatalogIds(allowed, current) }
  }
  const known = uniqueCatalogIds(allowed, current)
  if (known.includes(id)) {
    return {
      status: StyleRefCatalogToggleStatus.Applied,
      ids: known.filter(item => item !== id),
    }
  }
  if (known.length >= STYLE_REFERENCE_URL_MAX) {
    return { status: StyleRefCatalogToggleStatus.AtLimit, ids: known }
  }
  return { status: StyleRefCatalogToggleStatus.Applied, ids: [...known, id] }
}

export function catalogPayload(
  entries: readonly StyleRefCatalogEntry[],
  enabledIds: readonly string[],
  canEdit: boolean,
): { items: StyleRefCatalogItem[]; canEdit: boolean } {
  const enabled = new Set(uniqueCatalogIds(catalogIdSet(entries), enabledIds))
  return {
    canEdit,
    items: entries.map(item => ({
      id: item.id,
      url: item.url,
      label: item.label,
      enabled: enabled.has(item.id),
    })),
  }
}

export function parseStyleRefCatalog(
  entries: readonly StyleRefCatalogEntry[],
  defaultEnabled: readonly string[],
  value: Record<string, unknown>,
): { items: StyleRefCatalogItem[]; canEdit: boolean } {
  const allowed = catalogIdSet(entries)
  const rawItems = value[StyleRefCatalogBodyKey.Items]
  const parsed = Array.isArray(rawItems)
    ? rawItems.flatMap(item => {
        const parsedItem = parseStyleRefCatalogItem(entries, allowed, item)
        return parsedItem ? [parsedItem] : []
      })
    : []
  if (parsed.length === 0) {
    return catalogPayload(entries, defaultEnabled, false)
  }
  return {
    items: parsed,
    canEdit: value[StyleRefCatalogBodyKey.CanEdit] === true,
  }
}

export function parseStyleRefCatalogForMode(
  mode: GenerationMode,
  value: Record<string, unknown>,
): { items: StyleRefCatalogItem[]; canEdit: boolean } {
  const def = styleRefCatalogDef(mode)
  if (!def) return { items: [], canEdit: false }
  return parseStyleRefCatalog(def.entries, def.defaultEnabled, value)
}

export type StyleRefCatalogByMode = Partial<
  Record<GenerationMode, { items: StyleRefCatalogItem[]; canEdit: boolean }>
>

export function catalogItemsForMode(
  mode: GenerationMode,
  byMode: StyleRefCatalogByMode,
): StyleRefCatalogItem[] {
  const loaded = byMode[mode]
  if (loaded) return loaded.items
  const def = styleRefCatalogDef(mode)
  if (!def) return []
  return catalogPayload(def.entries, def.defaultEnabled, false).items
}

export function catalogUrlsForMode(
  mode: GenerationMode,
  byMode: StyleRefCatalogByMode,
): readonly string[] | undefined {
  if (!hasStyleRefCatalog(mode)) return undefined
  const loaded = byMode[mode]
  if (loaded) return loaded.items.filter(item => item.enabled).map(item => item.url)
  return defaultStyleRefCatalogUrls(mode)
}

function parseStyleRefCatalogItem(
  entries: readonly StyleRefCatalogEntry[],
  allowed: ReadonlySet<string>,
  value: unknown,
): StyleRefCatalogItem | null {
  const record = recordFromJson(value)
  const id = readString(record[StyleRefCatalogBodyKey.Id])
  const url = readString(record[StyleRefCatalogBodyKey.Url])
  if (!id || !url || !allowed.has(id)) return null
  const catalog = entries.find(item => item.id === id)
  if (!catalog) return null
  return {
    id,
    url,
    label: catalog.label,
    enabled: record[StyleRefCatalogBodyKey.Enabled] === true,
  }
}
