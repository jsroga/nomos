'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { LocalStorageKeys } from '@/constants/localStorage'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface DomainSidebarProps {
  title: string
  children: React.ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  className?: string
  headerActions?: React.ReactNode
  resizeHandle?: 'left' | 'right'
}

const DEFAULT_WIDTH = 320
const MIN_WIDTH = 240
const MAX_WIDTH = 600

export const DomainSidebar: React.FC<DomainSidebarProps> = ({
  title,
  children,
  defaultWidth = DEFAULT_WIDTH,
  minWidth = MIN_WIDTH,
  maxWidth = MAX_WIDTH,
  className,
  headerActions,
  resizeHandle = 'left',
}) => {
  const [width, setWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LocalStorageKeys.SIDEBAR_WIDTH)
      return saved ? Math.max(minWidth, Math.min(maxWidth, parseInt(saved, 10))) : defaultWidth
    }
    return defaultWidth
  })

  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number>(0)
  const startWidthRef = useRef<number>(0)

  const saveWidth = useCallback((newWidth: number) => {
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
    setWidth(clampedWidth)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LocalStorageKeys.SIDEBAR_WIDTH, clampedWidth.toString())
    }
  }, [minWidth, maxWidth])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return
    const deltaX = resizeHandle === 'left' 
      ? startXRef.current - e.clientX // Resizing from left edge
      : e.clientX - startXRef.current // Resizing from right edge
    const newWidth = startWidthRef.current + deltaX
    saveWidth(newWidth)
  }, [isResizing, saveWidth, resizeHandle])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={sidebarRef}
      className={cn(
        'h-full bg-card border-r border-border flex flex-col relative',
        isResizing && 'select-none',
        className
      )}
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        className={cn(
          'absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10',
          resizeHandle === 'left' ? 'left-0' : 'right-0'
        )}
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <h1 className="font-bold text-xl">{title}</h1>
        {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">{children}</div>
      </ScrollArea>
    </div>
  )
}
