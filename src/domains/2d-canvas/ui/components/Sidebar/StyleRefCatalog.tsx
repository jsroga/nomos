'use client'

import { Switch } from '@/components/Switch'
import { cn } from '@/shared/data/utils'
import type { StyleRefCatalogItem } from '@/domains/2d-canvas/utils/style-ref-catalog'
import { WorldGenStyleRefsClass } from '../../utils/sidebar'

export function StyleRefCatalog({
  items,
  disabled,
  onToggle,
}: {
  items: readonly StyleRefCatalogItem[]
  disabled: boolean
  onToggle: (id: string) => void
}) {
  return (
    <ul className={WorldGenStyleRefsClass.CatalogGrid}>
      {items.map(item => (
        <li key={item.id}>
          <div
            className={cn(
              WorldGenStyleRefsClass.CatalogCell,
              !item.enabled && WorldGenStyleRefsClass.CatalogCellOff,
            )}
          >
            <img
              src={item.url}
              alt={item.label}
              className={WorldGenStyleRefsClass.CatalogImage}
            />
            <div className={WorldGenStyleRefsClass.CatalogChrome}>
              <span className={WorldGenStyleRefsClass.CatalogCaption}>{item.label}</span>
              <Switch
                checked={item.enabled}
                disabled={disabled}
                aria-label={item.label}
                onCheckedChange={() => onToggle(item.id)}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
