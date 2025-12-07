'use client'

import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LocalStorageKeys } from '@/constants/localStorage'
import { cn } from '@/lib/utils'

interface ResizableSidebarProps {
  /** The title displayed in the sidebar header */
  title: string
  /** Optional React node to render in the header (right side) */
  headerActions?: ReactNode
  /** Content to render in the scrollable area */
  children: ReactNode
  /** Unique identifier for localStorage (appended to key if multiple sidebars) */
  storageKey?: string
  /** Default width in pixels */
  defaultWidth?: number
  /** Minimum width in pixels */
  minWidth?: number
  /** Maximum width in pixels */
  maxWidth?: number
  /** Whether sidebar is on the right side (affects resize handle position) */
  position?: 'left' | 'right'
  /** Additional className for the sidebar container */
  className?: string
}

export const ResizableSidebar: React.FC<ResizableSidebarProps> = ({
  title,
  headerActions,
  children,
  storageKey = '',
  defaultWidth = 320,
  minWidth = 280,
  maxWidth = 500,
  position = 'left',
  className,
}) => {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Load saved width from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = storageKey
        ? `${LocalStorageKeys.SIDEBAR_WIDTH}-${storageKey}`
        : LocalStorageKeys.SIDEBAR_WIDTH
      const savedWidth = localStorage.getItem(key)
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10)
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          setWidth(parsed)
        }
      }
    }
  }, [storageKey, minWidth, maxWidth])

  // Save width to localStorage
  const saveWidth = useCallback(
    (newWidth: number) => {
      if (typeof window !== 'undefined') {
        const key = storageKey
          ? `${LocalStorageKeys.SIDEBAR_WIDTH}-${storageKey}`
          : LocalStorageKeys.SIDEBAR_WIDTH
        localStorage.setItem(key, newWidth.toString())
      }
    },
    [storageKey]
  )

  // Handle mouse move during resize
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return

      const sidebarRect = sidebarRef.current.getBoundingClientRect()
      let newWidth: number

      if (position === 'left') {
        // Resize handle is on the right edge
        newWidth = e.clientX - sidebarRect.left
      } else {
        // Resize handle is on the left edge
        newWidth = sidebarRect.right - e.clientX
      }

      // Clamp width to min/max
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      setWidth(newWidth)
    },
    [isResizing, position, minWidth, maxWidth]
  )

  // Handle mouse up (end resize)
  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false)
      saveWidth(width)
    }
  }, [isResizing, width, saveWidth])

  // Attach/detach event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  return (
    <div
      ref={sidebarRef}
      style={{ width }}
      className={cn(
        'h-full bg-card flex flex-col relative shrink-0',
        position === 'left' ? 'border-r border-border' : 'border-l border-border',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-xl">{title}</h1>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">{children}</div>
      </ScrollArea>

      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        className={cn(
          'absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 transition-colors z-50',
          position === 'left' ? 'right-0' : 'left-0',
          isResizing && 'bg-primary/30'
        )}
      />
    </div>
  )
}

// =============================================================================
// SidebarSection Component - Standardized settings box
// =============================================================================

interface SidebarSectionProps {
  /** Section title */
  title?: string
  /** Optional icon element */
  icon?: ReactNode
  /** Section content */
  children: ReactNode
  /** Actions to show in the header (right side) */
  headerActions?: ReactNode
  /** Additional className */
  className?: string
  /** Whether to show the muted background (default: true) */
  variant?: 'default' | 'plain'
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  icon,
  children,
  headerActions,
  className,
  variant = 'default',
}) => {
  return (
    <div
      className={cn(
        'rounded-lg space-y-3',
        variant === 'default' && 'bg-muted p-4 border border-border',
        variant === 'plain' && 'p-0',
        className
      )}
    >
      {(title || headerActions) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            {title && <h3 className="text-sm font-medium">{title}</h3>}
          </div>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  )
}

// =============================================================================
// SidebarField Component - Standardized field with label
// =============================================================================

interface SidebarFieldProps {
  /** Field label */
  label: string
  /** Optional value display on the right */
  value?: string | number
  /** Optional helper text below the field */
  helperText?: string
  /** Field content (input, slider, etc) */
  children: ReactNode
  /** Additional className */
  className?: string
}

export const SidebarField: React.FC<SidebarFieldProps> = ({
  label,
  value,
  helperText,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium">{label}</label>
        {value !== undefined && (
          <span className="text-xs text-muted-foreground">{value}</span>
        )}
      </div>
      {children}
      {helperText && <p className="text-[10px] text-muted-foreground">{helperText}</p>}
    </div>
  )
}

// =============================================================================
// SidebarTextarea Component - Standardized textarea
// =============================================================================

interface SidebarTextareaProps {
  /** Field label */
  label: string
  /** Value */
  value: string
  /** Change handler */
  onChange: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Optional helper text below */
  helperText?: string
  /** Height in pixels or Tailwind class */
  height?: string
  /** Additional className */
  className?: string
}

export const SidebarTextarea: React.FC<SidebarTextareaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  height = 'h-24',
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium block">{label}</label>
      <textarea
        className={cn(
          'w-full bg-background border border-input rounded-md p-3 text-sm resize-none',
          'focus:ring-2 focus:ring-primary focus:outline-none',
          height
        )}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  )
}

// =============================================================================
// SidebarInput Component - Standardized text input
// =============================================================================

interface SidebarInputProps {
  /** Field label */
  label?: string
  /** Value */
  value: string
  /** Change handler */
  onChange: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Optional helper text below */
  helperText?: string
  /** Input type */
  type?: 'text' | 'number' | 'password'
  /** Additional className */
  className?: string
}

export const SidebarInput: React.FC<SidebarInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  type = 'text',
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="text-xs font-medium block">{label}</label>}
      <input
        type={type}
        className={cn(
          'w-full bg-background border border-input rounded-md p-3 text-sm',
          'focus:ring-2 focus:ring-primary focus:outline-none'
        )}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  )
}
