'use client'

import * as React from 'react'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import {
  DomMouseEvent,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SidebarPosition,
} from '@/components/DomainSidebar/constants/domain-sidebar'

function widthStorageKey(storageKey?: string): string {
  return storageKey
    ? `${LocalStorageKeys.SIDEBAR_WIDTH}-${storageKey}`
    : LocalStorageKeys.SIDEBAR_WIDTH
}

interface UseDomainSidebarWidthArgs {
  storageKey?: string
  defaultWidth: number
  position: `${SidebarPosition}`
  sidebarRef: React.RefObject<HTMLDivElement | null>
}

export function useDomainSidebarWidth({
  storageKey,
  defaultWidth,
  position,
  sidebarRef,
}: UseDomainSidebarWidthArgs) {
  const [width, setWidth] = React.useState(defaultWidth)
  const [isResizing, setIsResizing] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(widthStorageKey(storageKey))
    if (!saved) return
    const parsed = parseInt(saved, 10)
    if (!isNaN(parsed) && parsed >= SIDEBAR_MIN_WIDTH && parsed <= SIDEBAR_MAX_WIDTH) {
      setWidth(parsed)
    }
  }, [storageKey])

  const saveWidth = React.useCallback(
    (nextWidth: number) => {
      if (typeof window === 'undefined') return
      localStorage.setItem(widthStorageKey(storageKey), nextWidth.toString())
    },
    [storageKey]
  )

  const handleMouseDown = React.useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    setIsResizing(true)
  }, [])

  React.useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (event: MouseEvent) => {
      if (!sidebarRef.current) return
      const rect = sidebarRef.current.getBoundingClientRect()
      const nextWidth =
        position === SidebarPosition.Left ? event.clientX - rect.left : rect.right - event.clientX
      setWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, nextWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      saveWidth(width)
    }

    document.addEventListener(DomMouseEvent.MouseMove, handleMouseMove)
    document.addEventListener(DomMouseEvent.MouseUp, handleMouseUp)

    return () => {
      document.removeEventListener(DomMouseEvent.MouseMove, handleMouseMove)
      document.removeEventListener(DomMouseEvent.MouseUp, handleMouseUp)
    }
  }, [isResizing, width, saveWidth, position, sidebarRef])

  return { width, isResizing, handleMouseDown }
}
