/**
 * SmartShimmer Component
 * 
 * Intelligent shimmer/loading indicator that shows:
 * - Exact placement (wraps the content being loaded)
 * - Progress indication when available
 * - Human-friendly status label
 * - Smooth transitions between loading and loaded states
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface SmartShimmerProps {
  /** Whether this section is loading */
  isLoading: boolean
  /** Progress percentage (0-100), optional */
  progress?: number | null
  /** Label to show during loading */
  label?: string | null
  /** Children to render (shown when not loading, or as overlay base) */
  children: React.ReactNode
  /** Shimmer style variant */
  variant?: 'overlay' | 'replace' | 'inline'
  /** Custom shimmer height when using replace mode */
  shimmerHeight?: string
  /** Additional className */
  className?: string
  /** Show spinner icon */
  showSpinner?: boolean
  /** Accent color for the shimmer */
  accentColor?: 'default' | 'blue' | 'purple' | 'orange' | 'green' | 'red'
}

const accentColors = {
  default: 'bg-muted/40',
  blue: 'bg-blue-500/10',
  purple: 'bg-purple-500/10',
  orange: 'bg-orange-500/10',
  green: 'bg-green-500/10',
  red: 'bg-red-500/10',
}

const accentBorders = {
  default: 'border-border/40',
  blue: 'border-blue-500/20',
  purple: 'border-purple-500/20',
  orange: 'border-orange-500/20',
  green: 'border-green-500/20',
  red: 'border-red-500/20',
}

const accentText = {
  default: 'text-muted-foreground',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  orange: 'text-orange-400',
  green: 'text-green-400',
  red: 'text-red-400',
}

export const SmartShimmer: React.FC<SmartShimmerProps> = ({
  isLoading,
  progress,
  label,
  children,
  variant = 'overlay',
  shimmerHeight = 'h-24',
  className,
  showSpinner = true,
  accentColor = 'default',
}) => {
  // Not loading - just render children
  if (!isLoading) {
    return <>{children}</>
  }

  // Replace mode - show shimmer instead of content
  if (variant === 'replace') {
    return (
      <div
        className={cn(
          'rounded-lg border animate-pulse',
          shimmerHeight,
          accentColors[accentColor],
          accentBorders[accentColor],
          className
        )}
      >
        <div className="h-full flex flex-col items-center justify-center gap-2 p-4">
          {showSpinner && (
            <Loader2 className={cn('w-5 h-5 animate-spin', accentText[accentColor])} />
          )}
          {label && (
            <span className={cn('text-xs font-medium', accentText[accentColor])}>
              {label}
            </span>
          )}
          {progress !== null && progress !== undefined && (
            <div className="w-full max-w-32">
              <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300 rounded-full',
                    accentColor === 'default' ? 'bg-primary/50' : accentColors[accentColor].replace('/10', '/50')
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={cn('text-[10px] mt-1 block text-center', accentText[accentColor])}>
                {progress}%
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Inline mode - show spinner next to content
  if (variant === 'inline') {
    return (
      <div className={cn('relative inline-flex items-center gap-2', className)}>
        {children}
        <div className="flex items-center gap-1.5">
          {showSpinner && (
            <Loader2 className={cn('w-3.5 h-3.5 animate-spin', accentText[accentColor])} />
          )}
          {label && (
            <span className={cn('text-xs', accentText[accentColor])}>{label}</span>
          )}
        </div>
      </div>
    )
  }

  // Overlay mode (default) - show content with shimmer overlay
  return (
    <div className={cn('relative', className)}>
      {/* Content with reduced opacity */}
      <div className="opacity-40 pointer-events-none transition-opacity duration-200">
        {children}
      </div>
      
      {/* Shimmer overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-[1px] rounded-lg">
        {showSpinner && (
          <Loader2 className={cn('w-6 h-6 animate-spin', accentText[accentColor])} />
        )}
        {label && (
          <span className={cn('text-sm font-medium', accentText[accentColor])}>
            {label}
          </span>
        )}
        {progress !== null && progress !== undefined && (
          <div className="w-24">
            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300 rounded-full bg-primary'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block text-center">
              {progress}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Skeleton shimmer lines for content placeholders
 */
interface ShimmerLinesProps {
  lines?: number
  className?: string
  accentColor?: 'default' | 'blue' | 'purple' | 'orange' | 'green' | 'red'
}

export const ShimmerLines: React.FC<ShimmerLinesProps> = ({
  lines = 3,
  className,
  accentColor = 'default',
}) => {
  const widths = ['w-3/4', 'w-full', 'w-5/6', 'w-2/3', 'w-1/2']
  
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 rounded animate-pulse',
            widths[i % widths.length],
            accentColors[accentColor]
          )}
        />
      ))}
    </div>
  )
}

/**
 * Multi-section loading indicator
 * Shows which sections are currently loading
 */
interface LoadingIndicatorProps {
  sections: Array<{
    id: string
    label: string
    progress?: number
    status: 'loading' | 'completing' | 'done' | 'error'
  }>
  className?: string
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  sections,
  className,
}) => {
  const activeSections = sections.filter(s => s.status === 'loading' || s.status === 'completing')
  
  if (activeSections.length === 0) return null

  return (
    <div className={cn(
      'fixed bottom-4 right-4 z-50 bg-card border border-border/50 rounded-lg shadow-lg p-3 min-w-48',
      className
    )}>
      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Generating {activeSections.length} section{activeSections.length > 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-1.5">
        {activeSections.map(section => (
          <div key={section.id} className="flex items-center gap-2">
            <div className="flex-1">
              <div className="text-xs font-medium truncate">{section.label}</div>
              {section.progress !== undefined && (
                <div className="h-1 bg-muted/30 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${section.progress}%` }}
                  />
                </div>
              )}
            </div>
            {section.status === 'completing' && (
              <span className="text-[10px] text-green-400">Done!</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default SmartShimmer
