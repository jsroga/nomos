'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Loader2,
  BookOpen,
  Users,
  Globe,
  Sparkles,
  Lightbulb,
  FileText,
  Check,
  Search,
  Brain,
  Pen,
  ChevronDown,
  ChevronRight,
  Music,
  Target,
  Zap,
  Eye,
} from 'lucide-react'

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

// Section icons - expanded for more operation types
const SECTION_ICONS: Record<string, React.ReactNode> = {
  // World building
  worldDescription: <Globe className="w-3.5 h-3.5" />,
  worldRules: <FileText className="w-3.5 h-3.5" />,
  factions: <Users className="w-3.5 h-3.5" />,
  keyCharacters: <Users className="w-3.5 h-3.5" />,
  plotTwists: <Sparkles className="w-3.5 h-3.5" />,
  metadata: <BookOpen className="w-3.5 h-3.5" />,
  episodeRoadmap: <Lightbulb className="w-3.5 h-3.5" />,
  full_bible: <BookOpen className="w-3.5 h-3.5" />,
  // Premise sections
  title: <Pen className="w-3.5 h-3.5" />,
  protagonistHook: <Target className="w-3.5 h-3.5" />,
  fatalFlaw: <Zap className="w-3.5 h-3.5" />,
  inevitableConsequence: <Eye className="w-3.5 h-3.5" />,
  thematicFocus: <Brain className="w-3.5 h-3.5" />,
  soundtracks: <Music className="w-3.5 h-3.5" />,
  // Operations
  analyzing: <Search className="w-3.5 h-3.5" />,
  reading: <BookOpen className="w-3.5 h-3.5" />,
  generating: <Sparkles className="w-3.5 h-3.5" />,
  thinking: <Brain className="w-3.5 h-3.5" />,
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
  // Premise sections
  title: 'Episode Title',
  protagonistHook: 'Protagonist Hook',
  fatalFlaw: 'Fatal Flaw',
  inevitableConsequence: 'Inevitable Consequence',
  thematicFocus: 'Thematic Focus',
  soundtracks: 'Soundtracks',
  // Operations
  analyzing: 'Analyzing context',
  reading: 'Reading data',
  generating: 'Generating content',
  thinking: 'Thinking',
}

// Helper to format agent names
const formatAgentName = (name: string): string => {
  if (!name) return ''
  if (name.includes('RunnableSequence')) return 'Supervisor'

  // Format "delegate_to_x_y" -> "X Y"
  if (name.startsWith('delegate_to_')) {
    return name
      .replace('delegate_to_', '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  // Default title case if not special
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export const StreamingContent: React.FC<StreamingContentProps> = ({
  agent,
  currentTokens,
  sections,
  isStreaming,
}) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  // Auto-scroll as content streams
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [currentTokens, isStreaming])

  if (!isStreaming && sections.length === 0 && !currentTokens) {
    return null
  }

  const completedCount = sections.filter(s => s.status === 'complete').length
  const totalCount = sections.length

  return (
    <div className="border border-border/30 rounded-lg bg-muted/5 overflow-hidden transition-all duration-300">
      {/* Cursor-like Header - Minimalist */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/20 transition-colors text-left"
      >
        {isStreaming ? (
          <Loader2 className="w-3 h-3 text-primary/70 animate-spin" />
        ) : (
          <Check className="w-3 h-3 text-green-500/70" />
        )}

        <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/80 flex-1">
          {formatAgentName(agent) || 'Agent'} {isStreaming ? 'Working' : 'Ready'}
        </span>

        {totalCount > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground/40">
            {completedCount}/{totalCount}
          </span>
        )}

        <div className="ml-1 opacity-40">
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </div>
      </button>

      {isExpanded && (
        <div className="animate-in slide-in-from-top-1 duration-200">
          {/* Cursor-like Progress Checklist */}
          {sections.length > 0 && (
            <div className="px-3 py-2 border-t border-border/10 space-y-0.5">
              {sections.map(section => (
                <ProgressStep key={section.key} section={section} />
              ))}
            </div>
          )}

          {/* Streaming Content - Tiny font, minimalist */}
          {currentTokens && (
            <div
              ref={contentRef}
              className="px-3 py-2 max-h-24 overflow-y-auto border-t border-border/10"
            >
              <StreamingText text={currentTokens} isStreaming={isStreaming} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Cursor-like progress step - Minimalist text-based version
const ProgressStep: React.FC<{ section: StreamingSection }> = ({ section }) => {
  const name = SECTION_NAMES[section.key] || section.name

  return (
    <div className="flex items-center gap-2 py-0.5 animate-in fade-in duration-200">
      <div className="w-3.5 h-3.5 flex items-center justify-center">
        {section.status === 'complete' ? (
          <Check className="w-2.5 h-2.5 text-green-500/70" />
        ) : section.status === 'streaming' ? (
          <Loader2 className="w-2.5 h-2.5 text-primary/70 animate-spin" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
        )}
      </div>

      <span
        className={cn(
          'text-[10px] uppercase tracking-wider font-medium',
          section.status === 'complete' && 'text-muted-foreground/50',
          section.status === 'streaming' && 'text-foreground/80',
          section.status === 'pending' && 'text-muted-foreground/30'
        )}
      >
        {name}
      </span>
    </div>
  )
}

// Legacy section indicator (grid style) - kept for backwards compatibility
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

// Streaming text with cursor - more compact
const StreamingText: React.FC<{ text: string; isStreaming: boolean }> = ({ text, isStreaming }) => {
  // Limit displayed text to last ~500 characters for performance
  const displayText = text.length > 500 ? '...' + text.slice(-500) : text

  return (
    <span className="whitespace-pre-wrap break-words text-xs text-muted-foreground font-mono">
      {displayText}
      {isStreaming && <span className="animate-pulse text-primary">▊</span>}
    </span>
  )
}

export { ProgressStep, SectionIndicator }
