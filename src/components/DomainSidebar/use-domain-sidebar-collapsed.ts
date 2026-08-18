'use client'

import * as React from 'react'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import {
  DomKeyboardEvent,
  SidebarCollapsedStorage,
  SidebarCollapseShortcut,
  SidebarEditableTag,
} from '@/components/DomainSidebar/constants/domain-sidebar'

function collapsedStorageKey(storageKey?: string, collapseStorageId?: string): string {
  const base = storageKey
    ? `${LocalStorageKeys.SIDEBAR_COLLAPSED}-${storageKey}`
    : LocalStorageKeys.SIDEBAR_COLLAPSED
  return collapseStorageId ? `${base}-${collapseStorageId}` : base
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (
    tag === SidebarEditableTag.Input ||
    tag === SidebarEditableTag.Textarea ||
    tag === SidebarEditableTag.Select
  ) {
    return true
  }
  return target.isContentEditable
}

interface UseDomainSidebarCollapsedArgs {
  enabled: boolean
  storageKey?: string
  collapseStorageId?: string
}

export function useDomainSidebarCollapsed({
  enabled,
  storageKey,
  collapseStorageId,
}: UseDomainSidebarCollapsedArgs) {
  const [collapsed, setCollapsed] = React.useState(false)

  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    const saved = localStorage.getItem(collapsedStorageKey(storageKey, collapseStorageId))
    setCollapsed(saved === SidebarCollapsedStorage.True)
  }, [enabled, storageKey, collapseStorageId])

  const persistCollapsed = React.useCallback(
    (next: boolean) => {
      if (typeof window === 'undefined') return
      localStorage.setItem(
        collapsedStorageKey(storageKey, collapseStorageId),
        next ? SidebarCollapsedStorage.True : SidebarCollapsedStorage.False
      )
    },
    [storageKey, collapseStorageId]
  )

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      persistCollapsed(next)
      return next
    })
  }, [persistCollapsed])

  React.useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return
      if (event.key !== SidebarCollapseShortcut.Key) return
      if (isEditableTarget(event.target)) return
      event.preventDefault()
      toggleCollapsed()
    }

    document.addEventListener(DomKeyboardEvent.KeyDown, handleKeyDown)
    return () => document.removeEventListener(DomKeyboardEvent.KeyDown, handleKeyDown)
  }, [enabled, toggleCollapsed])

  return { collapsed, toggleCollapsed }
}
