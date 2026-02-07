/**
 * SectionLoadingOverlay - Reusable loading overlay for Bible sections
 * 
 * ## SCIENCE-BASED UX PRINCIPLES:
 * 
 * 1. **Progressive Disclosure** (Nielsen Norman Group, 2006)
 *    - Shows only essential info during loading
 *    - Reduces cognitive load during wait states
 * 
 * 2. **Skeleton Screens > Spinners** (Viget Labs, 2015)
 *    - Perceived wait time is 50% shorter with skeleton screens
 *    - We use backdrop blur + spinner combo for best of both worlds
 * 
 * 3. **Localized Feedback** (Jakob Nielsen's Heuristic #1)
 *    - Loading state on the EXACT section being updated
 *    - User knows precisely what's happening and where
 * 
 * 4. **Human-Readable Messages** (Plain Language Movement)
 *    - No tech jargon ("Curating your soundtrack..." not "Fetching API...")
 *    - Action-oriented verbs that describe user benefit
 * 
 * ## ENGINEERING ABSTRACTION:
 * 
 * This component can be reused across ANY section that needs loading state:
 * - BibleSoundtracks
 * - BibleFactions
 * - BibleWorldLogic
 * - BibleInspirations
 * - BibleCharacters
 * - BibleRoadmap
 * 
 * Just wrap your section content and pass `isLoading` and `section` props.
 */

import React from 'react'
import { Loader2, Music, Globe, Users, Sparkles, Map, BookOpen, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

// Human-friendly messages for each section (no tech jargon!)
const FRIENDLY_MESSAGES: Record<string, { loading: string; icon: React.ElementType; color: string }> = {
  soundtracks: {
    loading: 'Curating your soundtrack...',
    icon: Music,
    color: 'text-cyan-400',
  },
  worldRules: {
    loading: 'Crafting the laws of your world...',
    icon: Globe,
    color: 'text-amber-400',
  },
  factions: {
    loading: 'Building power structures...',
    icon: Users,
    color: 'text-purple-400',
  },
  keyCharacters: {
    loading: 'Bringing characters to life...',
    icon: Users,
    color: 'text-rose-400',
  },
  inspirations: {
    loading: 'Finding creative references...',
    icon: Lightbulb,
    color: 'text-yellow-400',
  },
  worldDescription: {
    loading: 'Painting your world...',
    icon: Sparkles,
    color: 'text-indigo-400',
  },
  plotTwists: {
    loading: 'Weaving plot surprises...',
    icon: Sparkles,
    color: 'text-red-400',
  },
  episodeRoadmap: {
    loading: 'Mapping your story arc...',
    icon: Map,
    color: 'text-green-400',
  },
  sequences: {
    loading: 'Planning episode structure...',
    icon: BookOpen,
    color: 'text-blue-400',
  },
  // Fallback
  default: {
    loading: 'Working on it...',
    icon: Loader2,
    color: 'text-muted-foreground',
  },
}

interface SectionLoadingOverlayProps {
  /** Is this section currently loading? */
  isLoading: boolean
  /** Section identifier (soundtracks, factions, etc.) */
  section: string
  /** Optional custom message override */
  customMessage?: string
  /** Children to render (the actual section content) */
  children: React.ReactNode
  /** Additional className for the wrapper */
  className?: string
}

export const SectionLoadingOverlay: React.FC<SectionLoadingOverlayProps> = ({
  isLoading,
  section,
  customMessage,
  children,
  className,
}) => {
  const config = FRIENDLY_MESSAGES[section] || FRIENDLY_MESSAGES.default
  const Icon = config.icon
  const message = customMessage || config.loading

  return (
    <div className={cn('relative', className)}>
      {/* Loading overlay - positioned above content */}
      {isLoading && (
        <div 
          className="absolute inset-0 z-10 bg-background/70 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200"
          role="status"
          aria-live="polite"
          aria-label={message}
        >
          {/* Icon with pulse animation */}
          <div className={cn('p-3 rounded-full bg-background/50 border border-border', config.color)}>
            <Icon className="w-5 h-5 animate-pulse" />
          </div>
          
          {/* Friendly message */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className={cn('w-4 h-4 animate-spin', config.color)} />
            <span className="font-medium">{message}</span>
          </div>
          
          {/* Progress hint - science shows users prefer knowing something is happening */}
          <p className="text-xs text-muted-foreground/60">
            This usually takes a few seconds
          </p>
        </div>
      )}
      
      {/* Actual content - slightly dimmed when loading */}
      <div className={cn(isLoading && 'opacity-30 pointer-events-none transition-opacity')}>
        {children}
      </div>
    </div>
  )
}

/**
 * Hook to get section loading state from context
 * 
 * Usage:
 * ```tsx
 * const { isLoading, message } = useSectionLoading('soundtracks')
 * ```
 */
export const useSectionLoading = (
  section: string,
  loadingSections?: Record<string, { loading: boolean; message?: string }>
) => {
  const sectionState = loadingSections?.[section]
  const config = FRIENDLY_MESSAGES[section] || FRIENDLY_MESSAGES.default
  
  return {
    isLoading: sectionState?.loading ?? false,
    message: sectionState?.message || config.loading,
    icon: config.icon,
    color: config.color,
  }
}

export { FRIENDLY_MESSAGES }
