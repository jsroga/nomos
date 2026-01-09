'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { LocalStorageKeys } from '@/constants/localStorage'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'

import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'

const DEFAULT_WIDTH = 320
const MIN_WIDTH = 280
const MAX_WIDTH = 500

interface DomainSidebarProps {
  /** Title displayed in the header, or a custom ReactNode */
  header: React.ReactNode
  /** Content below the header - will be scrollable */
  children: React.ReactNode
  /** Optional className for the root container */
  className?: string
  /** Unique key for storing width in localStorage (e.g., 'world-gen', 'storyteller') */
  storageKey?: string
  /** Default width in pixels */
  defaultWidth?: number
  /** Position of sidebar - left sidebars have right resize handle, right sidebars have left resize handle */
  position?: 'left' | 'right'
  /** If true, children handle their own scroll/layout (no ScrollArea wrapper) */
  rawContent?: boolean
}

export const DomainSidebar: React.FC<DomainSidebarProps> = ({
  header,
  children,
  className,
  storageKey,
  defaultWidth = DEFAULT_WIDTH,
  position = 'left',
  rawContent = false,
}) => {
  const [width, setWidth] = React.useState(defaultWidth)
  const [isResizing, setIsResizing] = React.useState(false)
  const sidebarRef = React.useRef<HTMLDivElement>(null)

  // Load saved width from localStorage
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

  // Save width to localStorage when it changes
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

  // Handle resize mouse events
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  React.useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return
      const rect = sidebarRef.current.getBoundingClientRect()
      let newWidth: number

      if (position === 'left') {
        // For left sidebar, resize from right edge
        newWidth = e.clientX - rect.left
      } else {
        // For right sidebar, resize from left edge
        newWidth = rect.right - e.clientX
      }

      const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth))
      setWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      saveWidth(width)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, width, saveWidth, position])

  return (
    <div
      ref={sidebarRef}
      className={cn(
        'h-full bg-card flex flex-col relative shrink-0',
        position === 'left' ? 'border-r border-border' : 'border-l border-border',
        isResizing && 'select-none',
        className
      )}
      style={{ width }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        {typeof header === 'string' ? (
          <h1 className="font-bold text-xl">{header}</h1>
        ) : (
          header
        )}
      </div>

      {/* Content */}
      {rawContent ? (
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {children}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4">{children}</div>
        </ScrollArea>
      )}

      {/* Resize Handle - position depends on sidebar position */}
      <div
        className={cn(
          'absolute top-0 w-1 h-full cursor-ew-resize transition-colors z-10',
          'hover:bg-primary/30',
          isResizing && 'bg-primary/50',
          position === 'left' ? 'right-0' : 'left-0'
        )}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

// Standardized section wrapper for grouping related controls
// Standardized section wrapper for grouping related controls
interface SidebarSectionProps {
  title?: string
  children: React.ReactNode
  className?: string
  /** If true, adds a separator above the section */
  separator?: boolean
  /** Optional icon to display next to the title */
  icon?: React.ReactNode
  /** If true, section can be collapsed */
  collapsible?: boolean
  /** Default collapsed state (if collapsible is true) */
  defaultOpen?: boolean
  /** Optional callback when toggle state changes */
  onToggle?: (isOpen: boolean) => void
  /** Optional subtitle or right-side content in header */
  rightContent?: React.ReactNode
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  children,
  className,
  separator = true,
  icon,
  collapsible = false,
  defaultOpen = true,
  onToggle,
  rightContent
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  // Sync internal state if defaultOpen changes (optional, but good for reset)
  // React.useEffect(() => setIsOpen(defaultOpen), [defaultOpen])

  const handleToggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    onToggle?.(newState)
  }

  return (
    <div
      className={cn(
        'space-y-2',
        separator && 'py-4 border-t border-border first:py-0 first:border-0 first:mb-4',
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between mb-2">
          {collapsible ? (
            <button
              onClick={handleToggle}
              className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 hover:text-foreground transition-colors w-full text-left"
            >
              <div className={cn("transition-transform duration-200", isOpen ? "rotate-90" : "")}>
                <ChevronRight size={12} />
              </div>
              {icon}
              <span className="flex-1">{title}</span>
              {rightContent}
            </button>
          ) : (
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 flex-1">
              {icon}
              {title}
              {rightContent && <div className="ml-auto">{rightContent}</div>}
            </h3>
          )}
        </div>
      )}
      {(!collapsible || isOpen) && (
        <div className={cn(collapsible && "animate-in slide-in-from-top-1 fade-in duration-200")}>
          {children}
        </div>
      )}
    </div>
  )
}

// Standardized settings box with muted background
interface SidebarSettingsBoxProps {
  title?: string
  children: React.ReactNode
  className?: string
  /** Optional icon to display next to title */
  icon?: React.ReactNode
}

export const SidebarSettingsBox: React.FC<SidebarSettingsBoxProps> = ({
  title,
  children,
  className,
  icon,
}) => {
  return (
    <div
      className={cn(
        'bg-[#191919] p-4 rounded-lg border border-border space-y-3',
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
      )}
      {children}
    </div>
  )
}

// NEW: Standardized Header for Main Panel Title (e.g. "World Gen")
export const SidebarHeader: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => {
  return (
    <h2 className={cn('text-sm font-mono font-bold uppercase tracking-widest text-muted-foreground', className)}>
      {children}
    </h2>
  )
}

// Standardized label for form fields
interface SidebarLabelProps {
  children: React.ReactNode
  htmlFor?: string
  hint?: string
  className?: string
  // Use small/mono style?
  variant?: 'default' | 'small'
}

export const SidebarLabel: React.FC<SidebarLabelProps> = ({
  children,
  htmlFor,
  hint,
  className,
  variant = 'small' // Defaulting to small now for consistency
}) => {
  return (
    <div className={cn('space-y-1', className)}>
      <label
        htmlFor={htmlFor}
        // UPGRADED STYLE: Using inline-flex so icons appear next to text
        className={cn(
          'inline-flex items-center gap-1 font-mono font-medium text-muted-foreground',
          variant === 'small' ? 'text-[10px] uppercase tracking-wide' : 'text-sm',
        )}
      >
        {children}
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// Standardized textarea for sidebar use
interface SidebarTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export const SidebarTextarea = React.forwardRef<
  HTMLTextAreaElement,
  SidebarTextareaProps
>(({ label, hint, className, ...props }, ref) => {
  return (
    <div className="space-y-2">
      {label && <SidebarLabel hint={hint}>{label}</SidebarLabel>}
      <textarea
        ref={ref}
        className={cn(
          'w-full bg-background/50 border-2 border-border/60 rounded-md p-3 text-sm font-mono resize-none',
          'hover:border-border transition-colors',
          'focus:border-primary focus:ring-1 focus:ring-primary/30 focus:outline-none',
          'placeholder:text-muted-foreground/60',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/30 disabled:border-border/30',
          className
        )}
        {...props}
      />
    </div>
  )
})
SidebarTextarea.displayName = 'SidebarTextarea'

// Standardized input for sidebar use
interface SidebarInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

export const SidebarInput = React.forwardRef<HTMLInputElement, SidebarInputProps>(
  ({ label, hint, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && <SidebarLabel hint={hint}>{label}</SidebarLabel>}
        <input
          ref={ref}
          className={cn(
            'w-full bg-background/50 border-2 border-border/60 rounded-md px-3 py-2 text-sm font-mono',
            'hover:border-border transition-colors',
            'focus:border-primary focus:ring-1 focus:ring-primary/30 focus:outline-none',
            'placeholder:text-muted-foreground/60',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/30 disabled:border-border/30',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
SidebarInput.displayName = 'SidebarInput'

// Standardized slider row with label and value display
interface SidebarSliderRowProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
}

export const SidebarSliderRow: React.FC<SidebarSliderRowProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  formatValue,
}) => {
  const displayValue = formatValue ? formatValue(value) : value
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-muted-foreground font-mono text-xs">{displayValue}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        className="w-full"
      />
    </div>
  )
}

// Standardized toggle row with label and switch
interface SidebarToggleRowProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}

export const SidebarToggleRow: React.FC<SidebarToggleRowProps> = ({
  label,
  checked,
  onChange,
  className,
}) => {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="font-medium font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

// Standardized empty state for sidebar
interface SidebarEmptyStateProps {
  icon?: React.ReactNode
  message: string
  className?: string
}

export const SidebarEmptyState: React.FC<SidebarEmptyStateProps> = ({
  icon,
  message,
  className,
}) => {
  return (
    <div
      className={cn(
        'text-center text-muted-foreground mt-10 flex flex-col items-center gap-3',
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
          {icon}
        </div>
      )}
      <p>{message}</p>
    </div>
  )
}
