'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Message, AgentConfigMap, AgentQuestion } from '../types'
import { Bot, User, Loader2, CheckCircle2, AlertCircle, Clock, Brain, ChevronDown, ChevronRight, Copy, RefreshCw, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import QuestionCard from '@/domains/storyteller/components/QuestionCard'

// ============================================
// Friendly Agent Name Mapping
// ============================================

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  'Showrunner': 'Showrunner',
  'PlotArchitect': 'Plot Architect',
  'CharacterPsychology': 'Character Expert',
  'ConsequenceTracker': 'Story Tracker',
  'DevilsAdvocate': "Devil's Advocate",
  'VisualMoment': 'Visual Designer',
  'Writer': 'Writer',
  'User': 'You',
  'Supervisor': 'Showrunner',
  'supervisor': 'Showrunner',
  'delegate_to_premise_architect': 'Premise Architect',
  'DELEGATE_TO_PREMISE_ARCHITECT': 'Premise Architect',
  'premiseArchitect': 'Premise Architect',
  'PremiseArchitect': 'Premise Architect',
  'PREMISEARCHITECT': 'Premise Architect',
  'delegate_to_plot_architect': 'Plot Architect',
  'delegate_to_character_psychology': 'Character Expert',
  'delegate_to_world_simulator': 'World Simulator',
  'delegate_to_magic_agent': 'Creative Spark',
  'WorldSimulator': 'World Simulator',
  'MagicAgent': 'Creative Spark',
  'EpisodePremiseArchitect': 'Premise Architect',
  'episodePremiseArchitect': 'Premise Architect',
  'ScriptEditor': 'Script Editor',
}

const getAgentDisplayName = (agentName: string): string => {
  if (AGENT_DISPLAY_NAMES[agentName]) {
    return AGENT_DISPLAY_NAMES[agentName]
  }
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

// Check if a message is a delegation/technical message
const isDelegationMessage = (msg: Message): boolean => {
  const content = msg.content?.toLowerCase() || ''
  const sender = (msg.sender || msg.name || '').toLowerCase()
  
  // If the message is substantial, it's not just a technical delegation step
  if (content.length > 100 || content.split(' ').length > 15) return false
  
  return (
    content.includes('delegating to') ||
    content.includes('delegated task') ||
    sender.includes('delegate_to_') ||
    sender === 'supervisor' ||
    (sender.includes('delegate') && content.length < 100)
  )
}

// Check if a message is pure JSON (technical data without readable message)
const isPureJsonMessage = (msg: Message): boolean => {
  const content = msg.content?.trim() || ''
  if (!content.startsWith('{')) return false
  
  try {
    const parsed = JSON.parse(content)
    // If it has a readable message field, it's not "pure" JSON
    if (parsed.message && typeof parsed.message === 'string') return false
    // Otherwise it's technical JSON data
    return true
  } catch {
    return false
  }
}

// ============================================
// Agent Status Types and Indicator
// ============================================

export type AgentStatus = 'idle' | 'thinking' | 'working' | 'complete' | 'error' | 'waiting'

export interface AgentStatusInfo {
  agent: string
  status: AgentStatus
  message?: string
  startTime?: number
  details?: string
}

interface AgentStatusIndicatorProps {
  status: AgentStatusInfo
  config: { color: string; bgColor: string; icon: React.ReactNode }
  showDetails?: boolean
}

/**
 * Agent Status Indicator Component - Minimalist
 */
export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({
  status,
  config,
  showDetails = true,
}) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (status.status === 'thinking' || status.status === 'working') {
      const interval = setInterval(() => {
        if (status.startTime) {
          setElapsed(Math.floor((Date.now() - status.startTime) / 1000))
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [status.status, status.startTime])

  const getStatusIcon = () => {
    switch (status.status) {
      case 'thinking':
        return <Brain className="w-3.5 h-3.5" />
      case 'working':
        return <Loader2 className="w-3.5 h-3.5 animate-spin" />
      case 'complete':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70" />
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500/70" />
      case 'waiting':
        return <Clock className="w-3.5 h-3.5 text-amber-500/70" />
      default:
        return config.icon
    }
  }

  const getStatusLabel = () => {
    switch (status.status) {
      case 'thinking':
        return 'Thinking'
      case 'working':
        return 'Working'
      case 'complete':
        return 'Complete'
      case 'error':
        return 'Error'
      case 'waiting':
        return 'Waiting'
      default:
        return 'Idle'
    }
  }

  const isActive = status.status === 'thinking' || status.status === 'working'

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className={cn(
        'flex items-center gap-2.5 px-3 py-1.5 rounded border border-border/20 bg-muted/5',
        isActive && 'border-primary/20'
      )}
    >
      <div className="flex items-center gap-2">
        <div className="opacity-70">
          {getStatusIcon()}
        </div>
        <span className="font-bold text-[10px] uppercase tracking-widest opacity-80">
          {getAgentDisplayName(status.agent)}
        </span>
      </div>
      
      <div className="flex-1 flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{status.message || getStatusLabel()}</span>
        
        {isActive && elapsed > 0 && (
          <span className="text-[10px] text-muted-foreground/50 font-mono">
            ({elapsed}s)
          </span>
        )}
      </div>

      {showDetails && status.details && (
        <span className="text-[10px] text-muted-foreground/40 truncate max-w-[150px] font-mono">
          {status.details}
        </span>
      )}
    </motion.div>
  )
}

/**
 * Active Agents Panel
 * Shows all currently active agents
 */
export const ActiveAgentsPanel: React.FC<{
  activeAgents: AgentStatusInfo[]
  agentConfig: AgentConfigMap
}> = ({ activeAgents, agentConfig }) => {
  if (activeAgents.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {activeAgents.map((status) => (
          <AgentStatusIndicator
            key={status.agent}
            status={status}
            config={agentConfig[status.agent] || {
              color: 'text-muted-foreground',
              bgColor: 'bg-muted/50 border-border',
              icon: <Bot className="w-4 h-4" />,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

/**
 * Collapsible Delegation Chain
 * Groups technical delegation messages into an expandable section
 */
const DelegationChain: React.FC<{ messages: Message[] }> = ({ messages }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (messages.length === 0) return null
  
  return (
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Processing... ({messages.length} steps)</span>
      </button>
      
      {isExpanded && (
        <div className="mt-2 ml-4 pl-3 border-l border-muted space-y-1">
          {messages.map((msg, idx) => {
            const agentName = msg.sender || msg.name || 'Unknown'
            const displayName = getAgentDisplayName(agentName)
            return (
              <div key={idx} className="text-xs text-muted-foreground py-1">
                <span className="font-medium">{displayName}:</span>{' '}
                <span className="opacity-70">{msg.content.slice(0, 80)}{msg.content.length > 80 ? '...' : ''}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface AgentLogProps {
    messages: Message[]
    agentConfig: AgentConfigMap
    onQuestionAnswer?: (questionId: string, answer: string | string[]) => void
    onQuestionSkip?: (questionId: string) => void
    showThinking?: boolean
    children?: React.ReactNode
    ActionComponent?: React.ComponentType<{ action: any, agentName: string, id: string }>
    QuestionComponent?: React.ComponentType<{ question: AgentQuestion, onAnswer: (a: string | string[]) => void, onSkip?: () => void }>
    // New props for enhanced UX
    activeAgents?: AgentStatusInfo[]
    showActiveAgents?: boolean
    isActivityPanelOpen?: boolean
    isSending?: boolean
}

export const AgentLog: React.FC<AgentLogProps> = ({
    messages,
    agentConfig,
    onQuestionAnswer,
    onQuestionSkip,
    showThinking = false,
    children,
    ActionComponent, // Optional injection for custom action rendering
    QuestionComponent, // Optional injection for custom question rendering
    activeAgents = [],
    showActiveAgents = true,
    isActivityPanelOpen = false,
    isSending = false,
}) => {
    const bottomRef = useRef<HTMLDivElement>(null)
    const [hasProcessed, setHasProcessed] = useState(false)
    const lastIsSending = useRef(isSending)

    // Track when processing finishes to show the "Done" marker
    useEffect(() => {
        if (lastIsSending.current && !isSending) {
            setHasProcessed(true)
        } else if (isSending) {
            setHasProcessed(false)
        }
        lastIsSending.current = isSending
    }, [isSending])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, activeAgents, isSending, hasProcessed])

    const getAgentConfigLocal = (agentName: string) => {
        // Try exact match first
        if (agentConfig[agentName]) {
            return agentConfig[agentName]
        }
        // Try normalized match
        const normalized = agentName.replace(/[_-]/g, '').toLowerCase()
        for (const [key, config] of Object.entries(agentConfig)) {
            if (key.toLowerCase() === normalized) {
                return config
            }
        }
        return {
            color: 'text-muted-foreground',
            icon: <Bot className="w-3.5 h-3.5" />,
        }
    }

    // Group messages: collect consecutive delegation messages into chains
    const groupedMessages: Array<{ type: 'message' | 'delegation', messages: Message[] }> = []
    let currentDelegationChain: Message[] = []

    messages.forEach((msg) => {
        if (isDelegationMessage(msg)) {
            currentDelegationChain.push(msg)
        } else {
            if (currentDelegationChain.length > 0) {
                groupedMessages.push({ type: 'delegation', messages: currentDelegationChain })
                currentDelegationChain = []
            }
            groupedMessages.push({ type: 'message', messages: [msg] })
        }
    })
    // Don't forget trailing delegation chain
    if (currentDelegationChain.length > 0) {
        groupedMessages.push({ type: 'delegation', messages: currentDelegationChain })
    }

    return (
        <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pb-4">
            {/* Active Agents Panel */}
            {showActiveAgents && activeAgents.length > 0 && (
                <ActiveAgentsPanel
                    activeAgents={activeAgents}
                    agentConfig={agentConfig}
                />
            )}
            
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
                
                // Skip pure JSON messages when Activity is OFF
                if (!isActivityPanelOpen && isPureJsonMessage(msg)) {
                    return null
                }
                
                const agentName = msg.sender || msg.name || 'Unknown'
                const displayName = getAgentDisplayName(agentName)
                const isHuman = msg.type === 'human' || agentName === 'User'
                const config = getAgentConfigLocal(agentName)

                return (
                    <div key={groupIdx} className={cn('text-sm animate-in fade-in slide-in-from-bottom-1 duration-300', isHuman ? 'ml-12' : 'mr-4')}>
                        {/* Agent Header - Minimalist */}
                        <div className={cn('flex items-center gap-2 mb-1.5', isHuman ? 'justify-end text-primary' : config.color)}>
                            {!isHuman && <div className="p-0.5 opacity-70">{config.icon}</div>}
                            <span className="font-bold text-[10px] uppercase tracking-[0.1em] opacity-80">{displayName}</span>
                            {isHuman && <div className="p-0.5 opacity-70"><User className="w-3.5 h-3.5" /></div>}
                            
                            {!isHuman && msg.confidence !== undefined && isActivityPanelOpen && (
                                <span className="text-[10px] text-muted-foreground/60 ml-auto font-mono">
                                    {Math.round(msg.confidence * 100)}%
                                </span>
                            )}
                        </div>

                        {/* Thinking (if enabled and Activity is ON) */}
                        {showThinking && msg.thinking && isActivityPanelOpen && (
                            <div className="mb-3 p-2.5 rounded border border-dashed border-border/40 text-[11px] text-muted-foreground italic leading-relaxed bg-muted/5">
                                <span className="font-semibold not-italic text-[10px] uppercase tracking-wider opacity-70">Thinking:</span> {msg.thinking}
                            </div>
                        )}

                        {/* Message Content - Minimalist (No background box) */}
                        <div className={cn(
                            'relative group leading-relaxed',
                            isHuman ? 'text-right text-foreground/90' : 'text-foreground border-l-2 border-border/30 pl-4 py-0.5'
                        )}>
                            <MessageContent content={msg.content} isActivityPanelOpen={isActivityPanelOpen} />
                            {/* Hover Actions */}
                            {!isHuman && (
                                <MessageHoverActions content={msg.content} />
                            )}
                        </div>

                        {/* Actions - using flex wrap for compact display */}
                        {msg.actions && msg.actions.length > 0 && ActionComponent && isActivityPanelOpen && (
                            <div className={cn("mt-3 flex flex-wrap gap-2", isHuman ? "justify-end" : "pl-4")}>
                                {msg.actions.map((action, actionIdx) => (
                                    <ActionComponent
                                        key={actionIdx}
                                        action={action}
                                        agentName={displayName}
                                        id={`${groupIdx}-${actionIdx}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Questions */}
                        {msg.questions && msg.questions.length > 0 && QuestionComponent && (
                            <div className={cn("mt-4 space-y-3", isHuman ? "items-end" : "pl-4")}>
                                {msg.questions.map(question => (
                                    <QuestionComponent
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

            {/* Status Indicators */}
            <div className="mt-4 border-t border-border/10 pt-2 px-2">
                {isSending ? (
                    <div className="flex items-center gap-2 text-primary/60 text-[10px] uppercase tracking-widest font-medium animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Processing...</span>
                    </div>
                ) : (hasProcessed && isActivityPanelOpen) ? (
                    <div className="flex items-center gap-2 text-green-500/40 text-[10px] uppercase tracking-widest font-medium animate-in fade-in duration-500">
                        <Check className="w-3 h-3" />
                        <span>Done</span>
                    </div>
                ) : null}
            </div>

            {children}

            <div ref={bottomRef} />
        </div>
    )
}

// ============================================
// Message Content - Renders markdown-like content with URLs
// ============================================

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
            parts.push(<em key={key} className="text-muted-foreground">{match[4]}</em>)
        } else if (match[5]) {
            // URL - subtle styling
            const url = match[5]
            parts.push(
                <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 transition-colors"
                >
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

// Hover actions for message content (Cursor-like)
const MessageHoverActions: React.FC<{ content: string }> = ({ content }) => {
    const [copied, setCopied] = useState(false)
    
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }
    
    return (
        <div className="absolute top-1 right-1 flex items-center gap-0.5 p-0.5 rounded bg-card/90 border border-border/50 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
                onClick={handleCopy}
                title={copied ? 'Copied!' : 'Copy'}
                className="p-1 rounded hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
            >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </button>
        </div>
    )
}

// Collapsible JSON block for technical data (Activity ON only)
const CollapsibleJSON: React.FC<{ data: any }> = ({ data }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    
    return (
        <div className="border border-border/20 rounded bg-muted/5">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span className="uppercase tracking-wider font-medium">Technical Data</span>
            </button>
            {isExpanded && (
                <pre className="px-2 pb-2 text-[10px] overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap font-mono text-muted-foreground/70">
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    )
}

const MessageContent: React.FC<{ content: string; isActivityPanelOpen?: boolean }> = ({ content, isActivityPanelOpen = false }) => {
    // Check if content is JSON and extract message field
    let displayContent = content

    // Try to parse JSON if it looks like it
    if (content.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(content)
            if (parsed.message && typeof parsed.message === 'string') {
                displayContent = parsed.message
            } else {
                // Valid JSON but not our wrapper
                // When Activity OFF: hide JSON entirely
                if (!isActivityPanelOpen) {
                    return null
                }
                // When Activity ON: show in collapsible block
                return <CollapsibleJSON data={parsed} />
            }
        } catch {
            // Not valid JSON, might be streaming
            // Regex to extract message field from partial JSON
            const messageMatch = content.match(/"message"\s*:\s*"([^"]*)"?/)
            if (messageMatch) {
                displayContent = messageMatch[1]
            } else if (!isActivityPanelOpen) {
                // If it's technical JSON streaming and Activity is OFF, hide it
                return null
            }
        }
    }

    // Custom rendering for delegation messages (shouldn't show normally due to collapsing)
    if (displayContent.includes('Delegating to')) {
        const toolName = displayContent.replace('Delegating to', '').trim().replace('...', '')
        const friendlyName = getAgentDisplayName(toolName)

        return (
            <div className="flex items-center gap-2 text-muted-foreground italic">
                <span className="text-primary">→</span>
                <span>Handing off to <span className="font-semibold text-primary">{friendlyName}</span>...</span>
            </div>
        )
    }

    // Simple markdown-like rendering
    const lines = displayContent.split('\n')

    return (
        <div className="space-y-1.5">
            {lines.map((line, idx) => {
                const lineKey = `line-${idx}`
                
                // Headers (full line bold)
                if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                        <p key={lineKey} className="font-bold text-foreground">
                            {parseInlineFormatting(line.slice(2, -2), lineKey)}
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
                            <span className="flex-1">{parseInlineFormatting(line.slice(2), lineKey)}</span>
                        </div>
                    )
                }

                // Numbered items
                const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/)
                if (numberedMatch) {
                    return (
                        <div key={lineKey} className="flex gap-2 pl-1">
                            <span className="text-primary font-medium shrink-0 w-5">{numberedMatch[1]}.</span>
                            <span className="flex-1">{parseInlineFormatting(numberedMatch[2], lineKey)}</span>
                        </div>
                    )
                }

                // Regular paragraph with inline formatting
                return <p key={lineKey}>{parseInlineFormatting(line, lineKey)}</p>
            })}
        </div>
    )
}
