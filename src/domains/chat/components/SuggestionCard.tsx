'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, X, Edit3, Loader2, ChevronDown, ChevronRight } from 'lucide-react'

export interface Suggestion {
  id: string
  type: 'soundtracks' | 'world_rule' | 'beat' | 'character' | 'faction' | 'premise' | 'generic'
  title: string
  description?: string
  items?: Array<{ label: string; value: string }>
  preview?: string
}

interface SuggestionCardProps {
  suggestion: Suggestion
  onApply: () => void | Promise<void>
  onDismiss: () => void
  onEdit?: () => void
  className?: string
}

// Type-specific styling
const SUGGESTION_STYLES: Record<Suggestion['type'], { icon: string; color: string }> = {
  soundtracks: { icon: '🎵', color: 'border-red-500/30 bg-red-500/5' },
  world_rule: { icon: '📜', color: 'border-blue-500/30 bg-blue-500/5' },
  beat: { icon: '🎬', color: 'border-cyan-500/30 bg-cyan-500/5' },
  character: { icon: '👤', color: 'border-purple-500/30 bg-purple-500/5' },
  faction: { icon: '⚔️', color: 'border-orange-500/30 bg-orange-500/5' },
  premise: { icon: '💡', color: 'border-yellow-500/30 bg-yellow-500/5' },
  generic: { icon: '✨', color: 'border-primary/30 bg-primary/5' },
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onApply,
  onDismiss,
  onEdit,
  className,
}) => {
  const [isApplying, setIsApplying] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  const style = SUGGESTION_STYLES[suggestion.type] || SUGGESTION_STYLES.generic

  const handleApply = async () => {
    setIsApplying(true)
    try {
      await onApply()
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className={cn('rounded-lg border overflow-hidden', style.color, className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <span className="text-base">{style.icon}</span>
        <span className="text-sm font-medium flex-1">{suggestion.title}</span>
        {suggestion.items && (
          <span className="text-xs text-muted-foreground">{suggestion.items.length} items</span>
        )}
      </button>

      {isExpanded && (
        <>
          {/* Description */}
          {suggestion.description && (
            <div className="px-3 pb-2 text-xs text-muted-foreground">{suggestion.description}</div>
          )}

          {/* Items Preview */}
          {suggestion.items && suggestion.items.length > 0 && (
            <div className="px-3 pb-2 space-y-1 max-h-40 overflow-y-auto">
              {suggestion.items.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <span className="text-primary font-medium shrink-0">{idx + 1}.</span>
                  <div>
                    <span className="font-medium">{item.label}</span>
                    {item.value && (
                      <span className="text-muted-foreground ml-1">– {item.value}</span>
                    )}
                  </div>
                </div>
              ))}
              {suggestion.items.length > 5 && (
                <div className="text-xs text-muted-foreground italic">
                  +{suggestion.items.length - 5} more...
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {suggestion.preview && (
            <div className="px-3 pb-2">
              <div className="p-2 rounded bg-muted/30 text-xs text-muted-foreground font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                {suggestion.preview}
              </div>
            </div>
          )}

          {/* Actions - Cursor-like */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-black/5 border-t border-border/30">
            <button
              onClick={handleApply}
              disabled={isApplying}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isApplying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              Apply
            </button>

            {onEdit && (
              <button
                onClick={onEdit}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  'bg-muted/50 text-foreground/80 hover:bg-muted'
                )}
              >
                <Edit3 className="w-3 h-3" />
                Edit
              </button>
            )}

            <button
              onClick={onDismiss}
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all',
                'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <X className="w-3 h-3" />
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Helper to detect suggestions in AI responses
export const detectSuggestion = (
  content: string,
  actions?: Array<{ type: string; payload?: any }>
): Suggestion | null => {
  // Check for soundtrack suggestions
  if (
    content.toLowerCase().includes('soundtrack') &&
    content.includes('1.') &&
    content.includes('2.')
  ) {
    const lines = content.split('\n')
    const items: Array<{ label: string; value: string }> = []

    lines.forEach(line => {
      const match = line.match(/^\d+\.\s+\*?\*?"?(.+?)"?\*?\*?\s*[–-]\s*(.+)$/i)
      if (match) {
        items.push({ label: match[1].trim(), value: match[2].trim() })
      }
    })

    if (items.length > 0) {
      return {
        id: `suggestion-${Date.now()}`,
        type: 'soundtracks',
        title: `Add ${items.length} Soundtracks`,
        items,
      }
    }
  }

  // Check for world rule suggestions
  if (actions?.some(a => a.type === 'ADD_WORLD_RULE')) {
    const ruleAction = actions.find(a => a.type === 'ADD_WORLD_RULE')
    return {
      id: `suggestion-${Date.now()}`,
      type: 'world_rule',
      title: 'Add World Rule',
      description: ruleAction?.payload?.name,
      preview: ruleAction?.payload?.description,
    }
  }

  // Check for beat suggestions
  if (actions?.some(a => a.type === 'CREATE_BEAT')) {
    const beatAction = actions.find(a => a.type === 'CREATE_BEAT')
    return {
      id: `suggestion-${Date.now()}`,
      type: 'beat',
      title: 'Create Story Beat',
      description: beatAction?.payload?.logline,
    }
  }

  return null
}

