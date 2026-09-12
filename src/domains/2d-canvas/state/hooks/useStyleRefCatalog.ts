import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { StyleRefCatalogToggleStatus } from '../../constants/style-ref-catalog'
import {
  fetchAllStyleRefCatalogs,
  saveStyleRefCatalogEnabledIds,
} from '../../core/io/style-ref-catalog.api'
import { GenerationMode } from '../../utils/generation-modes'
import {
  catalogIdSet,
  catalogItemsForMode,
  catalogUrlsForMode,
  nextCatalogEnabledIds,
  styleRefCatalogDef,
  type StyleRefCatalogByMode,
} from '../../utils/style-ref-catalog'
import { WorldGenSidebarToast } from '../../ui/utils/sidebar'

export function useStyleRefCatalog(mode: GenerationMode) {
  const [byMode, setByMode] = useState<StyleRefCatalogByMode>({})
  const [canEdit, setCanEdit] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const loaded = await fetchAllStyleRefCatalogs()
        if (cancelled) return
        setByMode(loaded.byMode)
        setCanEdit(loaded.canEdit)
      } catch {
        if (cancelled) return
        setByMode({})
        setCanEdit(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const items = useMemo(() => catalogItemsForMode(mode, byMode), [byMode, mode])

  const toggle = async (id: string): Promise<string[] | null> => {
    const def = styleRefCatalogDef(mode)
    if (!def) return null
    const next = nextCatalogEnabledIds(
      catalogIdSet(def.entries),
      items.filter(item => item.enabled).map(item => item.id),
      id,
    )
    if (next.status === StyleRefCatalogToggleStatus.AtLimit) {
      toast.error(WorldGenSidebarToast.StyleRefCatalogLimit)
      return null
    }
    if (next.status !== StyleRefCatalogToggleStatus.Applied) return null
    setIsSaving(true)
    try {
      const saved = await saveStyleRefCatalogEnabledIds(mode, next.ids)
      setByMode(prev => ({ ...prev, [mode]: saved }))
      setCanEdit(saved.canEdit)
      return saved.items.filter(item => item.enabled).map(item => item.url)
    } catch {
      toast.error(WorldGenSidebarToast.StyleRefCatalogSaveFailed)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  return {
    items,
    canEdit,
    isSaving,
    urlsFor: (modeId: GenerationMode) => catalogUrlsForMode(modeId, byMode),
    toggle,
  }
}
