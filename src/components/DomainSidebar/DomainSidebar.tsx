'use client'

import * as React from 'react'
import { cn } from '@/shared/data/utils'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { ScrollArea } from '@/components/ScrollArea'
import {
  DomMouseEvent,
  SidebarPosition,
} from '@/components/DomainSidebar/constants/domain-sidebar'

export * from './DomainSidebarControls'

const DEFAULT_WIDTH = 320
const MIN_WIDTH = 280
const MAX_WIDTH = 500

interface DomainSidebarProps {
  header: React.ReactNode
  children: React.ReactNode
  className?: string
  storageKey?: string
  defaultWidth?: number
  position?: `${SidebarPosition}`
  rawContent?: boolean
}

export const DomainSidebar: React.FC<DomainSidebarProps> = ({
  header,
  children,
  className,
  storageKey,
  defaultWidth = DEFAULT_WIDTH,
  position = SidebarPosition.Left,
  rawContent = false,
}) => {
  const [width, setWidth] = React.useState(defaultWidth)
  const [isResizing, setIsResizing] = React.useState(false)
  const sidebarRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const key = storageKey
      ? `${LocalStorageKeys.SIDEBAR_WIDTH}-${storageKey}`
      : LocalStorageKeys.SIDEBAR_WIDTH
    const saved = localStorage.getItem(key)
    if (saved) {
      const parsed = parseInt(saved, 10)
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        setWidth(parsed)
      }
    }
  }, [storageKey])

  const saveWidth = React.useCallback(
    (newWidth: number) => {
      if (typeof window === 'undefined') return
      const key = storageKey
        ? `${LocalStorageKeys.SIDEBAR_WIDTH}-${storageKey}`
        : LocalStorageKeys.SIDEBAR_WIDTH
      localStorage.setItem(key, newWidth.toString())
    },
    [storageKey]
  )

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  React.useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return
      const rect = sidebarRef.current.getBoundingClientRect()
      const newWidth =
        position === SidebarPosition.Left ? e.clientX - rect.left : rect.right - e.clientX
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)))
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
  }, [isResizing, width, saveWidth, position])

  return (
    <div
      ref={sidebarRef}
      className={cn(
        'h-full bg-background/60 backdrop-blur-xl flex flex-col relative shrink-0',
        position === SidebarPosition.Left ? 'border-r border-border/50' : 'border-l border-border/50',
        isResizing && 'select-none',
        className
      )}
      style={{ width }}
    >
      {header && (
        <div className="p-4 border-b border-border shrink-0">
          {typeof header === 'string' ? <h1 className="font-bold text-xl">{header}</h1> : header}
        </div>
      )}

      {rawContent ? (
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4">{children}</div>
        </ScrollArea>
      )}

      <div
        className={cn(
          'absolute top-0 w-1 h-full cursor-ew-resize transition-colors z-10',
          'hover:bg-primary/30',
          isResizing && 'bg-primary/50',
          position === SidebarPosition.Left ? 'right-0' : 'left-0'
        )}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
