import {
  LOCATION_MAP_SREF_CATALOG,
  LOCATION_MAP_SREF_DEFAULT_ENABLED,
  LocationMapSrefId,
  LocationMapSrefSetting,
} from '../constants/location-map-srefs'
import { StyleRefCatalogToggleStatus } from '../constants/style-ref-catalog'
import {
  catalogPayload,
  catalogUrlsForIds,
  nextCatalogEnabledIds,
  resolveCatalogEnabledIds,
  uniqueCatalogIds,
} from './style-ref-catalog'

const LOCATION_MAP_SREF_ID_SET = new Set<string>(Object.values(LocationMapSrefId))

export function isLocationMapSrefId(value: string): value is LocationMapSrefId {
  return LOCATION_MAP_SREF_ID_SET.has(value)
}

export function uniqueLocationMapSrefIds(ids: readonly string[]): LocationMapSrefId[] {
  return uniqueCatalogIds(LOCATION_MAP_SREF_ID_SET, ids).flatMap(id =>
    isLocationMapSrefId(id) ? [id] : [],
  )
}

export function resolveLocationMapEnabledIds(config: Record<string, unknown>): LocationMapSrefId[] {
  return uniqueLocationMapSrefIds(
    resolveCatalogEnabledIds(
      LOCATION_MAP_SREF_ID_SET,
      LOCATION_MAP_SREF_DEFAULT_ENABLED,
      config,
      LocationMapSrefSetting.EnabledIdsKey,
    ),
  )
}

export function locationMapSrefUrlsForIds(ids: readonly string[]): string[] {
  return catalogUrlsForIds(LOCATION_MAP_SREF_CATALOG, ids)
}

export function defaultLocationMapSrefUrls(): string[] {
  return locationMapSrefUrlsForIds(LOCATION_MAP_SREF_DEFAULT_ENABLED)
}

export function nextLocationMapEnabledIds(
  current: readonly string[],
  id: string,
): { status: StyleRefCatalogToggleStatus; ids: LocationMapSrefId[] } {
  const next = nextCatalogEnabledIds(LOCATION_MAP_SREF_ID_SET, current, id)
  return { status: next.status, ids: uniqueLocationMapSrefIds(next.ids) }
}

export function locationMapSrefCatalogPayload(
  enabledIds: readonly string[],
  canEdit: boolean,
) {
  return catalogPayload(LOCATION_MAP_SREF_CATALOG, enabledIds, canEdit)
}
