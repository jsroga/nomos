import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { buildUrl } from '@/shared/data/url-builder'
import { StyleRefCatalogBodyKey } from '../../constants/style-ref-catalog'
import { StyleRefApiRoute } from '../../utils/mj-sref'
import { GenerationMode } from '../../utils/generation-modes'
import {
  parseStyleRefCatalogForMode,
  styleRefCatalogModes,
  type StyleRefCatalogByMode,
} from '../../utils/style-ref-catalog'

export async function fetchStyleRefCatalog(mode: GenerationMode) {
  return parseStyleRefCatalogForMode(
    mode,
    await fetchJsonRecord(buildUrl(StyleRefApiRoute.Catalog, { [QueryParam.Mode]: mode })),
  )
}

export async function fetchAllStyleRefCatalogs(): Promise<{
  byMode: StyleRefCatalogByMode
  canEdit: boolean
}> {
  const modes = styleRefCatalogModes()
  const catalogs = await Promise.all(modes.map(item => fetchStyleRefCatalog(item)))
  const byMode: StyleRefCatalogByMode = {}
  let canEdit = false
  for (let index = 0; index < modes.length; index += 1) {
    const catalogMode = modes[index]
    const catalog = catalogs[index]
    if (!catalogMode || !catalog) continue
    byMode[catalogMode] = catalog
    if (catalog.canEdit) canEdit = true
  }
  return { byMode, canEdit }
}

export async function saveStyleRefCatalogEnabledIds(
  mode: GenerationMode,
  enabledIds: readonly string[],
) {
  return parseStyleRefCatalogForMode(
    mode,
    await fetchJsonRecord(StyleRefApiRoute.Catalog, {
      method: HttpMethod.Put,
      headers: { 'Content-Type': ContentType.Json },
      body: JSON.stringify({
        [StyleRefCatalogBodyKey.Mode]: mode,
        [StyleRefCatalogBodyKey.EnabledIds]: enabledIds,
      }),
    }),
  )
}
