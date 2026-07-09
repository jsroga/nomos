'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/data/utils'
import { AgentAction, AgentQuestion } from '@/domains/storyteller/core/types/ActionTypes'
import { ActionCommitted, ActionSuggestion } from '../ActionToast'
import { ActionHistoryStatus } from '@/domains/storyteller/core/types/Enums'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { QuestionCard } from '../QuestionCard'
import { ReferenceText } from '../ReferenceText'
import { hasReferences } from '@/domains/storyteller/core/entities/ReferenceParser'
import {
  Bot,
  User,
  Sparkles,
  Brain,
  Lightbulb,
  Scale,
  Eye,
  Pen,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react'

export interface Message {
  sender?: string
  name?: string
  content: string
  type?: 'human' | 'ai'
  actions?: AgentAction[]
  questions?: AgentQuestion[]
  thinking?: string
  confidence?: number
  // Extended thinking metadata (from agent-v2-base)
  additional_kwargs?: {
    thinking?: string | null
    hasThinking?: boolean
    extendedThinkingEnabled?: boolean
    taskComplete?: boolean
    nextSteps?: string
    artifacts?: string[]
    thinkingEntries?: Array<{
      agent: string
      content: string
      timestamp: number
    }>
  }
}

interface AgentLogProps {
  messages: Message[]
  onQuestionAnswer?: (questionId: string, answer: string | string[]) => void
  onQuestionSkip?: (questionId: string) => void
  onActionAccept?: (messageIndex: number, actionIndex: number) => void
  onActionReject?: (messageIndex: number, actionIndex: number) => void
  onActionReview?: (messageIndex: number, actionIndex: number) => void
  showThinking?: boolean
  isActivityPanelOpen?: boolean
  children?: React.ReactNode
  /** Project ID for entity reference resolution */
  projectId?: string
}

// Friendly display name mapping for agents
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  // Internal/technical names -> Friendly names
  Showrunner: 'Showrunner',
  PlotArchitect: 'Plot Architect',
  CharacterPsychology: 'Character Expert',
  ConsequenceTracker: 'Logic Guardian',
  DevilsAdvocate: 'Devil\'s Advocate',
  VisualMoment: 'Visual Designer',
  Writer: 'Writer',
  User: 'You',
  Supervisor: 'Showrunner',
  supervisor: 'Showrunner',
  // Delegate names
  delegate_to_premise_architect: 'Premise Architect',
  DELEGATE_TO_PREMISE_ARCHITECT: 'Premise Architect',
  premiseArchitect: 'Premise Architect',
  PremiseArchitect: 'Premise Architect',
  PREMISEARCHITECT: 'Premise Architect',
  delegate_to_plot_architect: 'Plot Architect',
  delegate_to_character_psychology: 'Character Expert',
  delegate_to_world_simulator: 'World Simulator',
  delegate_to_magic_agent: 'Creative Spark',
  WorldSimulator: 'World Simulator',
  MagicAgent: 'Creative Spark',
  EpisodePremiseArchitect: 'Premise Architect',
  episodePremiseArchitect: 'Premise Architect',
  ScriptEditor: 'Script Editor',
  // Specialized Council Agents (v2)
  Psychologist: 'Character Psychologist',
  Gardener: 'The Gardener',
  Storyteller: 'Storyteller',
  // Creative Directors
  CreativeDirector_GRRM: 'GRRM (Creative Director)',
  CreativeDirector_Gilligan: 'Vince Gilligan (Creative Director)',
  GRRM: 'George R.R. Martin',
  Gilligan: 'Vince Gilligan',
}

// Get friendly display name for an agent
const getAgentDisplayName = (agentName: string): string => {
  // Check direct mapping first
  if (AGENT_DISPLAY_NAMES[agentName]) {
    return AGENT_DISPLAY_NAMES[agentName]
  }
  // Try to convert camelCase/PascalCase to Title Case
  const converted = agentName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/delegate to /i, '')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
  return converted || agentName
}

// Agent configuration with colors and icons - Minimalist version
const AGENT_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  Showrunner: {
    color:
      'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full transition-all duration-300 bg-primary/10 border border-primary/30 text-primary',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  PlotArchitect: {
    color: 'text-blue-400/80',
    icon: <Lightbulb className="w-3.5 h-3.5" />,
  },
  CharacterPsychology: {
    color: 'text-purple-400/80',
    icon: <Brain className="w-3.5 h-3.5" />,
  },
  ConsequenceTracker: {
    color: 'text-green-400/80',
    icon: <Bot className="w-3.5 h-3.5" />,
  },
  DevilsAdvocate: {
    color: 'text-red-400/80',
    icon: <Scale className="w-3.5 h-3.5" />,
  },
  VisualMoment: {
    color: 'text-cyan-400/80',
    icon: <Eye className="w-3.5 h-3.5" />,
  },
  Writer: {
    color: 'text-orange-400/80',
    icon: <Pen className="w-3.5 h-3.5" />,
  },
  User: {
    color: 'text-primary',
    icon: <User className="w-3.5 h-3.5" />,
  },
  // Additional agents
  PremiseArchitect: {
    color: 'text-indigo-400/80',
    icon: <Lightbulb className="w-3.5 h-3.5" />,
  },
  Supervisor: {
    color:
      'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full transition-all duration-300 bg-primary/10 border border-primary/30 text-primary',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  // Specialized Council Agents (v2)
  Psychologist: {
    color: 'text-pink-400/80',
    icon: <Brain className="w-3.5 h-3.5" />,
  },
  Gardener: {
    color: 'text-emerald-400/80',
    icon: <Pen className="w-3.5 h-3.5" />,
  },
  Storyteller: {
    color: 'text-amber-400/80',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  // Creative Directors (GRRM & Gilligan style meta-agents)
  CreativeDirector_GRRM: {
    color: 'text-rose-500/90',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  CreativeDirector_Gilligan: {
    color: 'text-yellow-500/90',
    icon: <Eye className="w-3.5 h-3.5" />,
  },
  GRRM: {
    color: 'text-rose-500/90',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  Gilligan: {
    color: 'text-yellow-500/90',
    icon: <Eye className="w-3.5 h-3.5" />,
  },
}

const getAgentConfig = (agentName: string) => {
  // Try exact match first
  if (AGENT_CONFIG[agentName]) {
    return AGENT_CONFIG[agentName]
  }
  // Try to find a match by normalized name
  const normalized = agentName.replace(/[_-]/g, '').toLowerCase()
  for (const [key, config] of Object.entries(AGENT_CONFIG)) {
    if (key.toLowerCase() === normalized) {
      return config
    }
  }
  // Default fallback
  return {
    color: 'text-muted-foreground',
    icon: <Bot className="w-3.5 h-3.5" />,
  }
}

// Check if a message is a delegation/technical message that should be collapsed
const isDelegationMessage = (msg: Message): boolean => {
  const content = msg.content?.toLowerCase() || ''
  const sender = (msg.sender || msg.name || '').toLowerCase()

  return (
    content.includes('delegating to') ||
    content.includes('delegated task') ||
    sender.includes('delegate_to_') ||
    sender === 'supervisor' ||
    (sender.includes('delegate') && content.length < 100)
  )
}

// Collapsible delegation chain component - Minimalist
const DelegationChain: React.FC<{ messages: Message[] }> = ({ messages }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (messages.length === 0) return null

  return (
    <div className="mb-3 pl-4 border-l border-border/20">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1 uppercase tracking-widest font-medium"
      >
        {isExpanded ? (
          <ChevronDown className="w-2.5 h-2.5" />
        ) : (
          <ChevronRight className="w-2.5 h-2.5" />
        )}
        <Loader2 className="w-2.5 h-2.5 animate-spin opacity-50" />
        <span>Process: {messages.length} steps</span>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {messages.map((msg, idx) => {
            const agentName = msg.sender || msg.name || 'Unknown'
            const displayName = getAgentDisplayName(agentName)
            return (
              <div
                key={idx}
                className="text-[10px] text-muted-foreground/50 font-mono leading-tight"
              >
                <span className="text-muted-foreground/70 uppercase">{displayName}:</span>{' '}
                {msg.content.slice(0, 100)}
                {msg.content.length > 100 ? '...' : ''}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const AgentLog: React.FC<AgentLogProps> = ({
  messages,
  onQuestionAnswer,
  onQuestionSkip,
  onActionAccept,
  onActionReject,
  onActionReview,
  showThinking = false,
  isActivityPanelOpen = false,
  children,
  projectId,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Group messages: collect consecutive delegation messages into chains
  const groupedMessages: Array<{ type: 'message' | 'delegation'; messages: Message[] }> = []
  let currentDelegationChain: Message[] = []

  messages.forEach((msg, _idx) => {
    if (isDelegationMessage(msg)) {
      currentDelegationChain.push(msg)
    } else {
      // If we have a pending delegation chain, add it first
      if (currentDelegationChain.length > 0) {
        groupedMessages.push({ type: 'delegation', messages: currentDelegationChain })
        currentDelegationChain = []
      }
      groupedMessages.push({ type: 'message', messages: [msg] })
    }
  })
  // Don't forget trailing delegation chain (shown as "Processing...")
  if (currentDelegationChain.length > 0) {
    groupedMessages.push({ type: 'delegation', messages: currentDelegationChain })
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pb-4">
      {groupedMessages.map((group, groupIdx) => {
        // Strict Activity Filtering: Skip technical delegation if Activity is OFF
        if (group.type === 'delegation' && !isActivityPanelOpen) {
          return null
        }

        // Render delegation chain as collapsed
        if (group.type === 'delegation') {
          return <DelegationChain key={`delegation-${groupIdx}`} messages={group.messages} />
        }

        // Render regular message
        const msg = group.messages[0]
        const agentName = msg.sender || msg.name || 'Unknown'
        const displayName = getAgentDisplayName(agentName)
        const isHuman = msg.type === 'human' || agentName === 'User'
        const config = getAgentConfig(agentName)

        return (
          <div
            key={groupIdx}
            className={cn(
              'text-sm animate-in fade-in slide-in-from-bottom-1 duration-300',
              isHuman ? 'ml-12' : 'mr-4'
            )}
          >
            {/* Agent Header - Minimalist */}
            <div
              className={cn(
                'flex items-center gap-2 mb-1.5',
                isHuman ? 'justify-end text-primary' : config.color
              )}
            >
              {!isHuman && <div className="p-0.5 opacity-70">{config.icon}</div>}
              <span className="font-bold text-[10px] uppercase tracking-[0.1em] opacity-80">
                {displayName}
              </span>
              {isHuman && (
                <div className="p-0.5 opacity-70">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}

              {!isHuman && msg.confidence !== undefined && isActivityPanelOpen && (
                <span className="text-[10px] text-muted-foreground/60 ml-auto font-mono">
                  {Math.round(msg.confidence * 100)}%
                </span>
              )}
            </div>

            {/* Thinking (if enabled and Activity is ON) - Enhanced multi-agent thinking display */}
            {(() => {
              // Get thinking entries from additional_kwargs for multi-agent attribution
              const thinkingEntries = msg.additional_kwargs?.thinkingEntries
              const thinkingContent = msg.thinking || msg.additional_kwargs?.thinking
              const hasExtendedThinking =
                msg.additional_kwargs?.hasThinking || msg.additional_kwargs?.extendedThinkingEnabled

              if (
                !showThinking ||
                !isActivityPanelOpen ||
                (!thinkingContent && !thinkingEntries?.length)
              )
                return null

              // If we have structured thinking entries, render them individually
              if (thinkingEntries && thinkingEntries.length > 0) {
                return (
                  <div className="mb-3 space-y-2">
                    {thinkingEntries.map((entry, entryIdx) => {
                      const entryConfig = getAgentConfig(entry.agent)
                      const entryDisplayName = getAgentDisplayName(entry.agent)
                      return (
                        <div
                          key={entryIdx}
                          className="rounded-lg border border-border/30 bg-gradient-to-br from-muted/10 to-transparent overflow-hidden"
                        >
                          {/* Agent Header */}
                          <div
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-muted/5',
                              entryConfig.color
                            )}
                          >
                            <div className="p-1 rounded bg-background/50">{entryConfig.icon}</div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {entryDisplayName}
                            </span>
                            <span className="ml-auto text-[9px] text-muted-foreground/50 font-mono">
                              thinking...
                            </span>
                          </div>
                          {/* Thinking Content */}
                          <div className="p-3 text-[11px] text-muted-foreground/80 leading-relaxed">
                            <div className="whitespace-pre-wrap font-mono">
                              {entry.content.length > 600
                                ? entry.content.slice(0, 600) + '...'
                                : entry.content}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }

              // Fallback to legacy single thinking block
              return (
                <div className="mb-3 rounded-lg border border-border/30 bg-gradient-to-br from-purple-500/5 to-transparent overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-muted/5">
                    <div className="p-1 rounded bg-purple-500/10">
                      <Brain className="w-3 h-3 text-purple-400/70" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400/70">
                      {hasExtendedThinking ? 'Extended Thinking' : 'Thinking'}
                    </span>
                  </div>
                  <div className="p-3 text-[11px] text-muted-foreground/80 leading-relaxed">
                    <div className="whitespace-pre-wrap font-mono">
                      {typeof thinkingContent === 'string' && thinkingContent.length > 800
                        ? thinkingContent.slice(0, 800) + '...'
                        : thinkingContent}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Message Content - Minimalist (No background box) */}
            <div
              className={cn(
                'relative group leading-relaxed',
                isHuman
                  ? 'text-right text-foreground/90'
                  : 'text-foreground border-l-2 border-border/30 pl-4 py-0.5'
              )}
            >
              <MessageContent content={msg.content} projectId={projectId} />
            </div>

            {/* Actions - show pending for approval or committed */}
            {msg.actions && msg.actions.length > 0 && (
              <div className={cn('mt-3 space-y-2', isHuman ? 'items-end' : 'pl-4')}>
                {msg.actions.map((action, actionIdx) => {
                  // Get original message index for callbacks
                  const originalMsgIndex = messages.findIndex(m => m === msg)

                  // Show ActionSuggestion for pending actions, ActionCommitted for committed
                  if (action.status === ApprovalActionStatus.PENDING && (onActionAccept || onActionReject)) {
                    return (
                      <ActionSuggestion
                        key={actionIdx}
                        action={action}
                        agentName={displayName}
                        onAccept={() => onActionAccept?.(originalMsgIndex, actionIdx)}
                        onReject={() => onActionReject?.(originalMsgIndex, actionIdx)}
                        onReview={() => onActionReview?.(originalMsgIndex, actionIdx)}
                      />
                    )
                  }

                  return (
                    <ActionCommitted
                      key={actionIdx}
                      entry={{
                        id: `${groupIdx}-${actionIdx}`,
                        timestamp: new Date(),
                        agentName: displayName,
                        action,
                        status: ActionHistoryStatus.COMMITTED,
                      }}
                      compact={true}
                    />
                  )
                })}
              </div>
            )}

            {/* Questions */}
            {msg.questions && msg.questions.length > 0 && (
              <div className={cn('mt-4 space-y-3', isHuman ? 'items-end' : 'pl-4')}>
                {msg.questions.map(question => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    onAnswer={answer => onQuestionAnswer?.(question.id, answer)}
                    onSkip={
                      question.urgency !== 'blocking'
                        ? () => onQuestionSkip?.(question.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
      {children}
      <div ref={bottomRef} />
    </div>
  )
}

// ============================================
// Message Content - Renders markdown-like content with URLs
// ============================================

// URL regex pattern
// Parse inline formatting (bold, italic, URLs) in text
const parseInlineFormatting = (text: string, keyPrefix: string = ''): React.ReactNode[] => {
  const parts: React.ReactNode[] = []

  // Combined pattern for bold, italic, and URLs
  const combinedPattern = /(\*\*(.+?)\*\*)|(_(.+?)_)|(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g

  let lastIndex = 0
  let match
  let keyCounter = 0

  while ((match = combinedPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const key = `${keyPrefix}-${keyCounter++}`

    if (match[1]) {
      // Bold: **text**
      parts.push(<strong key={key}>{match[2]}</strong>)
    } else if (match[3]) {
      // Italic: _text_
      parts.push(
        <em key={key} className="text-muted-foreground">
          {match[4]}
        </em>
      )
    } else if (match[5]) {
      // URL
      const url = match[5]
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
      parts.push(
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'underline underline-offset-2 transition-colors',
            isYouTube ? 'text-red-400 hover:text-red-300' : 'text-blue-400 hover:text-blue-300'
          )}
        >
          {isYouTube ? '▶ ' : ''}
          {url.length > 50 ? url.slice(0, 50) + '...' : url}
        </a>
      )
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

const MessageContent: React.FC<{ content: string; projectId?: string }> = ({
  content,
  projectId,
}) => {
  // Check if content is JSON and extract message field
  let displayContent = content

  if (content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content)
      if (parsed.message && typeof parsed.message === 'string') {
        displayContent = parsed.message
      }
    } catch {
      // Not valid JSON, use as-is
    }
  }

  // Custom rendering for delegation messages (shouldn't show normally due to collapsing)
  if (displayContent.includes('Delegating to')) {
    const toolName = displayContent.replace('Delegating to', '').trim().replace('...', '')
    const friendlyName = getAgentDisplayName(toolName)

    return (
      <div className="flex items-center gap-2 text-muted-foreground italic">
        <span className="text-primary">→</span>
        <span>
          Handing off to <span className="font-semibold text-primary">{friendlyName}</span>...
        </span>
      </div>
    )
  }

  // Check if content contains entity references - if so, use ReferenceText
  const contentHasReferences = hasReferences(displayContent)

  // Simple markdown-like rendering
  const lines = displayContent.split('\n')

  // Helper to render text with entity references
  const renderWithReferences = (text: string, key: string) => {
    if (contentHasReferences && hasReferences(text)) {
      return (
        <ReferenceText
          key={key}
          text={text}
          projectId={projectId}
          inline={true}
          renderText={(plainText, idx) => (
            <React.Fragment key={idx}>
              {parseInlineFormatting(plainText, `${key}-${idx}`)}
            </React.Fragment>
          )}
        />
      )
    }
    return parseInlineFormatting(text, key)
  }

  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const lineKey = `line-${idx}`

        // Headers (full line bold)
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <p key={lineKey} className="font-bold text-foreground">
              {renderWithReferences(line.slice(2, -2), lineKey)}
            </p>
          )
        }

        // Empty lines become spacers
        if (line.trim() === '') {
          return <div key={lineKey} className="h-2" />
        }

        // List items
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={lineKey} className="flex gap-2 pl-1">
              <span className="text-primary shrink-0">•</span>
              <span className="flex-1">{renderWithReferences(line.slice(2), lineKey)}</span>
            </div>
          )
        }

        // Numbered items
        const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/)
        if (numberedMatch) {
          return (
            <div key={lineKey} className="flex gap-2 pl-1">
              <span className="text-primary font-medium shrink-0 w-5">{numberedMatch[1]}.</span>
              <span className="flex-1">{renderWithReferences(numberedMatch[2], lineKey)}</span>
            </div>
          )
        }

        // Regular paragraph with inline formatting
        return <p key={lineKey}>{renderWithReferences(line, lineKey)}</p>
      })}
    </div>
  )
}
