import {
  PAINTED_ISOMETRIC_SREF_CATALOG,
  PAINTED_ISOMETRIC_SREF_DEFAULT_ENABLED,
  PaintedIsometricSrefId,
  PaintedIsometricSrefSetting,
} from '../constants/painted-isometric-srefs'
import { StyleRefCatalogToggleStatus } from '../constants/style-ref-catalog'
import {
  catalogPayload,
  catalogUrlsForIds,
  nextCatalogEnabledIds,
  resolveCatalogEnabledIds,
  uniqueCatalogIds,
} from './style-ref-catalog'

const PAINTED_ISOMETRIC_SREF_ID_SET = new Set<string>(Object.values(PaintedIsometricSrefId))

export function isPaintedIsometricSrefId(value: string): value is PaintedIsometricSrefId {
  return PAINTED_ISOMETRIC_SREF_ID_SET.has(value)
}

export function uniquePaintedIsometricSrefIds(
  ids: readonly string[],
): PaintedIsometricSrefId[] {
  return uniqueCatalogIds(PAINTED_ISOMETRIC_SREF_ID_SET, ids).flatMap(id =>
    isPaintedIsometricSrefId(id) ? [id] : [],
  )
}

export function resolvePaintedIsometricEnabledIds(
  config: Record<string, unknown>,
): PaintedIsometricSrefId[] {
  return uniquePaintedIsometricSrefIds(
    resolveCatalogEnabledIds(
      PAINTED_ISOMETRIC_SREF_ID_SET,
      PAINTED_ISOMETRIC_SREF_DEFAULT_ENABLED,
      config,
      PaintedIsometricSrefSetting.EnabledIdsKey,
    ),
  )
}

export function paintedIsometricSrefUrlsForIds(ids: readonly string[]): string[] {
  return catalogUrlsForIds(PAINTED_ISOMETRIC_SREF_CATALOG, ids)
}

export function defaultPaintedIsometricSrefUrls(): string[] {
  return paintedIsometricSrefUrlsForIds(PAINTED_ISOMETRIC_SREF_DEFAULT_ENABLED)
}

export function nextPaintedIsometricEnabledIds(
  current: readonly string[],
  id: string,
): { status: StyleRefCatalogToggleStatus; ids: PaintedIsometricSrefId[] } {
  const next = nextCatalogEnabledIds(PAINTED_ISOMETRIC_SREF_ID_SET, current, id)
  return { status: next.status, ids: uniquePaintedIsometricSrefIds(next.ids) }
}

export function paintedIsometricSrefCatalogPayload(
  enabledIds: readonly string[],
  canEdit: boolean,
) {
  return catalogPayload(PAINTED_ISOMETRIC_SREF_CATALOG, enabledIds, canEdit)
}
