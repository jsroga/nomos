'use client'

import { Switch } from '@/components/Switch'
import { cn } from '@/shared/data/utils'
import { StyleRefsClass } from './constants'

export interface StyleRefCatalogItem {
  id: string
  url: string
  label: string
  enabled: boolean
}

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
    <ul className={StyleRefsClass.CatalogGrid}>
      {items.map(item => (
        <li key={item.id}>
          <div
            className={cn(
              StyleRefsClass.CatalogCell,
              !item.enabled && StyleRefsClass.CatalogCellOff,
            )}
          >
            <img
              src={item.url}
              alt={item.label}
              className={StyleRefsClass.CatalogImage}
            />
            <div className={StyleRefsClass.CatalogChrome}>
              <span className={StyleRefsClass.CatalogCaption}>{item.label}</span>
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
