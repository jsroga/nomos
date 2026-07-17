'use client'

import * as React from 'react'
import { cn } from '@/shared/data/utils'
import { Slider } from '@/components/Slider'
import { Switch } from '@/components/Switch'
import { ChevronRight } from 'lucide-react'
import { SidebarLabelVariant } from '@/components/DomainSidebar/constants/domain-sidebar'

interface SidebarSectionProps {
  title?: string
  children: React.ReactNode
  className?: string
  separator?: boolean
  icon?: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  onToggle?: (isOpen: boolean) => void
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
  rightContent,
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

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
              className="text-xs font-mono font-bold text-indigo-400/90 uppercase tracking-widest flex items-center gap-1.5 hover:text-indigo-400 transition-colors w-full text-left"
            >
              <div className={cn('transition-transform duration-200', isOpen ? 'rotate-90' : '')}>
                <ChevronRight size={12} />
              </div>
              {icon}
              <span className="flex-1">{title}</span>
              {rightContent}
            </button>
          ) : (
            <h3 className="text-xs font-mono font-bold text-indigo-400/90 uppercase tracking-widest flex items-center gap-1.5 flex-1">
              {icon}
              {title}
              {rightContent && <div className="ml-auto">{rightContent}</div>}
            </h3>
          )}
        </div>
      )}
      {(!collapsible || isOpen) && (
        <div className={cn(collapsible && 'animate-in slide-in-from-top-1 fade-in duration-200')}>
          {children}
        </div>
      )}
    </div>
  )
}

interface SidebarSettingsBoxProps {
  title?: string
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}

export const SidebarSettingsBox: React.FC<SidebarSettingsBoxProps> = ({
  title,
  children,
  className,
  icon,
}) => {
  return (
    <div className={cn('bg-[#191919] p-4 rounded-lg border border-border space-y-3', className)}>
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

export const SidebarHeader: React.FC<React.PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => {
  return (
    <h2
      className={cn(
        'text-sm font-mono font-bold uppercase tracking-widest text-muted-foreground',
        className
      )}
    >
      {children}
    </h2>
  )
}

interface SidebarLabelProps {
  children: React.ReactNode
  htmlFor?: string
  hint?: string
  className?: string
  variant?: SidebarLabelVariant
}

export const SidebarLabel: React.FC<SidebarLabelProps> = ({
  children,
  htmlFor,
  hint,
  className,
  variant = SidebarLabelVariant.Small,
}) => {
  return (
    <div className={cn('space-y-1', className)}>
      <label
        htmlFor={htmlFor}
        className={cn(
          'inline-flex items-center gap-1 font-mono font-medium text-muted-foreground',
          variant === SidebarLabelVariant.Small ? 'text-[10px] uppercase tracking-wide' : 'text-sm'
        )}
      >
        {children}
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

interface SidebarTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export const SidebarTextarea = React.forwardRef<HTMLTextAreaElement, SidebarTextareaProps>(
  ({ label, hint, className, ...props }, ref) => {
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
  }
)
SidebarTextarea.displayName = 'SidebarTextarea'

interface SidebarInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
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
        <span className="font-medium font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground font-mono text-xs">{displayValue}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={vals => onChange(vals[0])}
        className="w-full"
      />
    </div>
  )
}

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
    <div className={cn('flex items-center justify-between', className)}>
      <span className="font-medium font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

const SIDEBAR_EMPTY_STATE_CLASS =
  'text-center text-muted-foreground flex flex-col items-center gap-3 py-3 text-[10px]'

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
    <div className={cn(SIDEBAR_EMPTY_STATE_CLASS, className)}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
          {icon}
        </div>
      )}
      <p>{message}</p>
    </div>
  )
}
