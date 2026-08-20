'use client'

import * as React from 'react'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import {
  DomMouseEvent,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SidebarPosition,
} from '@/components/DomainSidebar/constants/domain-sidebar'
import { sidebarWidthFromPointer } from './sidebar-width'

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
  const widthRef = React.useRef(width)
  const frameRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    widthRef.current = width
  }, [width])

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

    const applyWidth = (nextWidth: number) => {
      widthRef.current = nextWidth
      const node = sidebarRef.current
      if (node) node.style.width = `${nextWidth}px`
    }

    const handleMouseMove = (event: MouseEvent) => {
      const node = sidebarRef.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      const nextWidth = sidebarWidthFromPointer({
        position,
        clientX: event.clientX,
        left: rect.left,
        right: rect.right,
      })
      applyWidth(nextWidth)
      if (frameRef.current !== null) return
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        setWidth(widthRef.current)
      })
    }

    const handleMouseUp = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      applyWidth(widthRef.current)
      setWidth(widthRef.current)
      setIsResizing(false)
      saveWidth(widthRef.current)
    }

    document.addEventListener(DomMouseEvent.MouseMove, handleMouseMove)
    document.addEventListener(DomMouseEvent.MouseUp, handleMouseUp)

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      document.removeEventListener(DomMouseEvent.MouseMove, handleMouseMove)
      document.removeEventListener(DomMouseEvent.MouseUp, handleMouseUp)
    }
  }, [isResizing, saveWidth, position, sidebarRef])

  return { width, isResizing, handleMouseDown }
}
