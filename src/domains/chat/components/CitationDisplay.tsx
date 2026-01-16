/**
 * Citation Display Component
 *
 * Displays inline citation markers and expandable source previews.
 * Shows RAG confidence indicators for grounded responses.
 */

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  BookOpen,
  User,
  Globe,
  MessageSquare,
  Brain,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Citation {
  id: string
  marker: string // [1], [2], etc.
  source: string // Document type
  chunkId: string
  content?: string // Preview content
  confidence: number // 0-1
  metadata?: {
    documentType?: string
    episodeId?: string
    characterId?: string
    agentName?: string
    timestamp?: number
  }
}

interface CitationMarkerProps {
  marker: string
  confidence: number
  onClick?: () => void
  isActive?: boolean
}

interface CitationPreviewProps {
  citation: Citation
  isExpanded?: boolean
  onToggle?: () => void
}

interface CitationDisplayProps {
  citations: Citation[]
  showConfidence?: boolean
  collapsible?: boolean
  defaultExpanded?: boolean
  className?: string
}

/**
 * Get icon for document type
 */
function getSourceIcon(source: string) {
  switch (source) {
    case 'world_rule':
      return <Globe className="w-3.5 h-3.5" />
    case 'character_arc':
      return <User className="w-3.5 h-3.5" />
    case 'beat_decision':
      return <MessageSquare className="w-3.5 h-3.5" />
    case 'episode_summary':
      return <BookOpen className="w-3.5 h-3.5" />
    case 'agent_reasoning':
      return <Brain className="w-3.5 h-3.5" />
    default:
      return <FileText className="w-3.5 h-3.5" />
  }
}

/**
 * Get color for confidence level
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-emerald-500 bg-emerald-500/10'
  if (confidence >= 0.6) return 'text-blue-500 bg-blue-500/10'
  if (confidence >= 0.4) return 'text-amber-500 bg-amber-500/10'
  return 'text-red-500 bg-red-500/10'
}

/**
 * Format confidence as percentage
 */
function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

/**
 * Inline citation marker component
 */
export const CitationMarker: React.FC<CitationMarkerProps> = ({
  marker,
  confidence,
  onClick,
  isActive,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-mono font-medium',
        'transition-all duration-150 cursor-pointer',
        getConfidenceColor(confidence),
        isActive && 'ring-2 ring-offset-2 ring-offset-background',
        'hover:scale-105'
      )}
      title={`Source confidence: ${formatConfidence(confidence)}`}
    >
      {marker}
    </button>
  )
}

/**
 * Citation preview card component
 */
export const CitationPreview: React.FC<CitationPreviewProps> = ({
  citation,
  isExpanded,
  onToggle,
}) => {
  const confidencePercent = Math.round(citation.confidence * 100)

  return (
    <div className={cn('border rounded-lg overflow-hidden', 'transition-all duration-200')}>
      {/* Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 text-left',
          'hover:bg-muted/50 transition-colors'
        )}
      >
        <div className="flex items-center gap-2">
          {/* Marker */}
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-xs font-mono font-medium',
              getConfidenceColor(citation.confidence)
            )}
          >
            {citation.marker}
          </span>

          {/* Source icon and type */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {getSourceIcon(citation.source)}
            <span className="text-sm capitalize">{citation.source.replace(/_/g, ' ')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Confidence indicator */}
          <div className="flex items-center gap-1">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  citation.confidence >= 0.8
                    ? 'bg-emerald-500'
                    : citation.confidence >= 0.6
                      ? 'bg-blue-500'
                      : citation.confidence >= 0.4
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                )}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8">{confidencePercent}%</span>
          </div>

          {/* Expand toggle */}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && citation.content && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-3 py-2 border-t bg-muted/30">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {citation.content}
              </p>

              {/* Metadata */}
              {citation.metadata && (
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/50">
                  {citation.metadata.episodeId && (
                    <span className="text-xs text-muted-foreground">
                      Episode: {citation.metadata.episodeId.slice(0, 8)}...
                    </span>
                  )}
                  {citation.metadata.characterId && (
                    <span className="text-xs text-muted-foreground">
                      Character: {citation.metadata.characterId.slice(0, 8)}...
                    </span>
                  )}
                  {citation.metadata.agentName && (
                    <span className="text-xs text-muted-foreground">
                      Agent: {citation.metadata.agentName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Main CitationDisplay component
 */
export const CitationDisplay: React.FC<CitationDisplayProps> = ({
  citations,
  showConfidence = true,
  collapsible = true,
  defaultExpanded = false,
  className,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [isAllExpanded, setIsAllExpanded] = useState(defaultExpanded)

  const toggleCitation = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleAll = () => {
    if (isAllExpanded) {
      setExpandedIds(new Set())
    } else {
      setExpandedIds(new Set(citations.map(c => c.id)))
    }
    setIsAllExpanded(!isAllExpanded)
  }

  if (citations.length === 0) {
    return null
  }

  // Calculate average confidence
  const avgConfidence = citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sources</span>
          <span className="text-xs text-muted-foreground">
            ({citations.length} citation{citations.length !== 1 ? 's' : ''})
          </span>

          {showConfidence && (
            <span
              className={cn('text-xs px-1.5 py-0.5 rounded', getConfidenceColor(avgConfidence))}
            >
              Avg: {formatConfidence(avgConfidence)}
            </span>
          )}
        </div>

        {collapsible && citations.length > 1 && (
          <button
            onClick={toggleAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isAllExpanded ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>

      {/* Citations list */}
      <div className="space-y-2">
        {citations.map(citation => (
          <CitationPreview
            key={citation.id}
            citation={citation}
            isExpanded={expandedIds.has(citation.id)}
            onToggle={() => toggleCitation(citation.id)}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Inline citations parser - replaces [1], [2] markers with interactive components
 */
export function parseInlineCitations(
  text: string,
  citations: Citation[],
  onCitationClick?: (citation: Citation) => void
): React.ReactNode[] {
  const citationMap = new Map(citations.map(c => [c.marker, c]))
  const parts: React.ReactNode[] = []

  // Pattern to match [1], [2], etc.
  const pattern = /\[(\d+)\]/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    // Add text before marker
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    // Add citation marker
    const marker = match[0]
    const citation = citationMap.get(marker)

    if (citation) {
      parts.push(
        <CitationMarker
          key={`${citation.id}-${match.index}`}
          marker={marker}
          confidence={citation.confidence}
          onClick={() => onCitationClick?.(citation)}
        />
      )
    } else {
      parts.push(marker)
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

export default CitationDisplay
