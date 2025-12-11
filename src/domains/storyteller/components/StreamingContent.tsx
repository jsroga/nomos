'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, BookOpen, Users, Globe, Sparkles, Lightbulb, FileText } from 'lucide-react'

export interface StreamingSection {
  key: string
  name: string
  status: 'pending' | 'streaming' | 'complete'
  content?: string
  preview?: string
}

interface StreamingContentProps {
  /** Current agent generating content */
  agent: string
  /** Current tokens being streamed */
  currentTokens: string
  /** Sections being generated progressively */
  sections: StreamingSection[]
  /** Whether streaming is active */
  isStreaming: boolean
}

// Section icons
const SECTION_ICONS: Record<string, React.ReactNode> = {
  worldDescription: <Globe className="w-4 h-4" />,
  worldRules: <FileText className="w-4 h-4" />,
  factions: <Users className="w-4 h-4" />,
  keyCharacters: <Users className="w-4 h-4" />,
  plotTwists: <Sparkles className="w-4 h-4" />,
  metadata: <BookOpen className="w-4 h-4" />,
  episodeRoadmap: <Lightbulb className="w-4 h-4" />,
  full_bible: <BookOpen className="w-4 h-4" />,
}

const SECTION_NAMES: Record<string, string> = {
  worldDescription: 'World Description',
  worldRules: 'Laws of the World',
  factions: 'Factions & Powers',
  keyCharacters: 'Key Characters',
  plotTwists: 'Plot Twists',
  metadata: 'Story Metadata',
  episodeRoadmap: 'Episode Roadmap',
  full_bible: 'World Bible',
}

export const StreamingContent: React.FC<StreamingContentProps> = ({
  agent,
  currentTokens,
  sections,
  isStreaming,
}) => {
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-scroll as content streams
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [currentTokens, isStreaming])

  if (!isStreaming && sections.length === 0 && !currentTokens) {
    return null
  }

  return (
    <div className="border border-primary/30 rounded-lg bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b border-primary/20">
        <Loader2 className={cn('w-4 h-4 text-primary', isStreaming && 'animate-spin')} />
        <span className="font-medium text-sm text-primary">
          {agent || 'Premise Architect'} is generating...
        </span>
      </div>

      {/* Progressive Sections */}
      {sections.length > 0 && (
        <div className="px-4 py-3 border-b border-primary/10">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sections.map(section => (
              <SectionIndicator key={section.key} section={section} />
            ))}
          </div>
        </div>
      )}

      {/* Streaming Content */}
      {currentTokens && (
        <div
          ref={contentRef}
          className="px-4 py-3 max-h-64 overflow-y-auto font-mono text-sm text-foreground/80"
        >
          <StreamingText text={currentTokens} isStreaming={isStreaming} />
        </div>
      )}

      {/* Section Previews */}
      {sections.filter(s => s.status === 'complete' && s.preview).length > 0 && (
        <div className="px-4 py-3 space-y-2 border-t border-primary/10">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Generated Sections
          </p>
          {sections
            .filter(s => s.status === 'complete' && s.preview)
            .map(section => (
              <div
                key={section.key}
                className="p-2 rounded bg-muted/30 text-xs text-muted-foreground"
              >
                <span className="font-medium text-foreground">
                  {SECTION_NAMES[section.key] || section.name}:
                </span>{' '}
                {section.preview}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// Section indicator pill
const SectionIndicator: React.FC<{ section: StreamingSection }> = ({ section }) => {
  const icon = SECTION_ICONS[section.key] || <FileText className="w-3 h-3" />
  const name = SECTION_NAMES[section.key] || section.name

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors',
        section.status === 'pending' && 'bg-muted/50 text-muted-foreground',
        section.status === 'streaming' && 'bg-primary/20 text-primary animate-pulse',
        section.status === 'complete' && 'bg-green-500/20 text-green-600'
      )}
    >
      {section.status === 'streaming' ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : section.status === 'complete' ? (
        <span className="text-green-500">✓</span>
      ) : (
        icon
      )}
      <span className="truncate">{name}</span>
    </div>
  )
}

// Streaming text with cursor
const StreamingText: React.FC<{ text: string; isStreaming: boolean }> = ({ text, isStreaming }) => {
  // Limit displayed text to last ~1000 characters for performance
  const displayText = text.length > 1000 ? '...' + text.slice(-1000) : text

  return (
    <span className="whitespace-pre-wrap break-words">
      {displayText}
      {isStreaming && <span className="animate-pulse text-primary">▊</span>}
    </span>
  )
}

export default StreamingContent
