'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Message,
  AgentConfigMap,
  AgentQuestion,
  AgentAction,
  AgentConfig,
  ThinkingMessagesConfig,
  DEFAULT_THINKING_MESSAGES,
  getThinkingMessage,
  ActivityLogEntry,
} from '../types'
import {
  Bot,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Brain,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react'
import { ConsistencyMessage, ReferenceText, hasReferences } from '@/domains/storyteller'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

// ============================================
// Friendly Agent Name Mapping
// ============================================

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  Showrunner: 'Showrunner',
  PlotArchitect: 'Plot Architect',
  CharacterPsychology: 'Character Expert',
  ConsequenceTracker: 'Story Tracker',
  DevilsAdvocate: 'Devil\'s Advocate',
  VisualMoment: 'Visual Designer',
  Writer: 'Writer',
  User: 'You',
  Supervisor: 'Showrunner',
  supervisor: 'Showrunner',
  RunnableSequence: 'Processing',
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

  // NEVER treat user messages as delegation
  if (msg.type === 'human' || sender === 'user') return false

  // If the message is substantial, it's not just a technical delegation step
  if (content.length > 100 || content.split(' ').length > 15) return false

  // Never hide narrative text from the main host
  if (sender === 'showrunner' || sender === 'supervisor') {
    const isTechnical = content.includes('delegating to') || content.includes('delegated task')
    if (!isTechnical) return false
  }

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
  agent: string
  config: {
    color: string
    bgColor?: string
    icon: React.ReactNode
  }
  status: AgentStatus
  message?: string
  details?: string
  startTime: number
  showDetails?: boolean
}

/**
 * Agent Status Indicator Component - Minimalist
 */
export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({
  agent,
  config,
  status,
  message,
  details,
  startTime,
  showDetails = true,
}) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (status === 'thinking' || status === 'working') {
      const interval = setInterval(() => {
        if (startTime) {
          setElapsed(Math.floor((Date.now() - startTime) / 1000))
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [status, startTime])

  const getStatusIcon = () => {
    switch (status) {
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
    switch (status) {
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

  const isActive = status === 'thinking' || status === 'working'

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
        <div className="opacity-70">{getStatusIcon()}</div>
        <span className="font-bold text-[10px] uppercase tracking-widest opacity-80">
          {getAgentDisplayName(agent)}
        </span>
      </div>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{message || getStatusLabel()}</span>

        {isActive && elapsed > 0 && (
          <span className="text-[10px] text-muted-foreground/50 font-mono">({elapsed}s)</span>
        )}
      </div>

      {showDetails && details && (
        <span className="text-[10px] text-muted-foreground/40 truncate max-w-[150px] font-mono">
          {details}
        </span>
      )}
    </motion.div>
  )
}

/**
 * Activity Log Viewer
 * Renders a persistent timeline of technical agent activities
 */
const ActivityEntryItem: React.FC<{ entry: ActivityLogEntry }> = ({ entry }) => {
  const time = new Date(entry.timestamp).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  if (entry.type === 'tool') {
    // Normalise result to an object if it's a JSON string
    let resultObj: Record<string, unknown> | null = null
    if (typeof entry.toolResult === 'string') {
      try { resultObj = JSON.parse(entry.toolResult) } catch { /* keep null */ }
    } else if (entry.toolResult && typeof entry.toolResult === 'object') {
      resultObj = entry.toolResult as Record<string, unknown>
    }

    const isRejected = resultObj?.success === false
    const rejectionError = isRejected ? String(resultObj?.error || '') : ''
    const isSuccess = resultObj?.success === true

    return (
      <div className={cn(
        'flex gap-3 text-xs font-mono border-l-2 pl-3 py-2 ml-1 relative group hover:bg-white/5 transition-colors rounded-r',
        isRejected ? 'border-red-500/50' : 'border-purple-500/30'
      )}>
        <div className={cn(
          'absolute -left-[5px] top-2 w-2 h-2 rounded-full',
          isRejected ? 'bg-red-500/70' : 'bg-purple-500/50'
        )} />
        <span className="text-muted-foreground/50 w-16 shrink-0 pt-0.5">{time}</span>
        <div className="flex-1 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-[10px]',
              isRejected
                ? 'text-red-400 bg-red-500/10'
                : 'text-purple-400 bg-purple-500/10'
            )}>
              TOOL
            </span>
            <span className="text-foreground/90 font-semibold">{entry.toolName}</span>
            {isRejected && (
              <span className="ml-auto text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30 uppercase tracking-wider">
                ✗ Rejected
              </span>
            )}
            {isSuccess && (
              <span className="ml-auto text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/30 uppercase tracking-wider">
                ✓ OK
              </span>
            )}
          </div>

          {/* Rejection error — prominently displayed */}
          {isRejected && rejectionError && (
            <div className="bg-red-950/40 border border-red-500/30 rounded p-2.5 space-y-1">
              <span className="uppercase text-[9px] text-red-400/70 font-bold tracking-wider block">
                Rejection Reason
              </span>
              <p className="text-red-300/90 leading-relaxed whitespace-pre-wrap text-[11px]">
                {rejectionError}
              </p>
            </div>
          )}

          {/* Inputs — collapsed by default on rejection to keep focus on the error */}
          {entry.toolInput && !isRejected && (
            <div className="text-xs text-muted-foreground/70 bg-muted/10 p-2 rounded border border-white/5">
              <span className="uppercase text-[9px] opacity-70 block mb-1 tracking-wider">
                Input
              </span>
              <span className="font-mono text-purple-300/80 break-words whitespace-pre-wrap">
                {typeof entry.toolInput === 'string'
                  ? entry.toolInput
                  : JSON.stringify(entry.toolInput, null, 2)}
              </span>
            </div>
          )}

          {/* Result — only show full JSON when not a rejection (rejection already surfaced above) */}
          {!isRejected && entry.toolResult && (
            <div className="text-xs bg-black/40 p-2 rounded text-muted-foreground/80 border border-white/5">
              <span className="uppercase text-[9px] opacity-50 block mb-1 tracking-wider">
                Result
              </span>
              <pre className="whitespace-pre-wrap text-green-400/80 font-mono text-[10px] max-h-48 overflow-y-auto scrollbar-thin">
                {resultObj
                  ? JSON.stringify(resultObj, null, 2)
                  : String(entry.toolResult).slice(0, 500)}
              </pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (entry.type === 'thinking') {
    return (
      <div className="flex gap-3 text-xs font-mono border-l-2 border-amber-500/30 pl-3 py-1 ml-1 transition-colors hover:bg-white/5 rounded-r">
        <span className="opacity-50 w-16 shrink-0">{time}</span>
        <div className="flex-1">
          <span className="font-bold mr-2 uppercase text-[10px] text-amber-500">
            {entry.agent || 'Agent'} Thinking:
          </span>
          <span className="text-amber-100/60 italic">
            {entry.content?.length && entry.content.length > 200
              ? entry.content.slice(0, 200) + '...'
              : entry.content}
          </span>
        </div>
      </div>
    )
  }

  if (entry.type === 'action') {
    return (
      <div className="flex gap-3 text-xs font-mono border-l-2 border-blue-500/30 pl-3 py-2 ml-1 relative hover:bg-white/5 transition-colors rounded-r">
        <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-blue-500/50" />
        <span className="text-muted-foreground/50 w-16 shrink-0 pt-0.5">{time}</span>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold uppercase tracking-wider bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px]">
              ACTION
            </span>
            <span className="text-foreground/90 font-semibold">{entry.content}</span>
          </div>
          {entry.details && (
            <div className="text-[10px] text-muted-foreground/60 italic pl-1 border-l-2 border-white/10 ml-1">
              {JSON.stringify(entry.details).slice(0, 150)}...
            </div>
          )}
        </div>
      </div>
    )
  }

  if (entry.type === 'status') {
    const isThinking =
      entry.content?.toLowerCase().includes('thinking') ||
      entry.content?.toLowerCase().includes('processing')
    // Detect "Using <tool>..." status messages
    const toolMatch = entry.content?.match(/^Using (.+?)\.\.\.$/)
    return (
      <div
        className={cn(
          'flex gap-3 text-xs font-mono border-l-2 pl-3 py-1 ml-1 transition-colors hover:bg-white/5 rounded-r',
          isThinking
            ? 'border-amber-500/30 text-amber-200/80'
            : 'border-border/30 text-muted-foreground'
        )}
      >
        <span className="opacity-50 w-16 shrink-0">{time}</span>
        <div className="flex-1 flex items-center gap-2">
          <span
            className={cn(
              'font-bold mr-1 uppercase text-[10px]',
              isThinking ? 'text-amber-500' : 'text-foreground/60'
            )}
          >
            {entry.agent || 'System'}:
          </span>
          {toolMatch ? (
            <>
              <span className="opacity-70">Using</span>
              <span className="text-purple-300/90 font-semibold">{toolMatch[1]}</span>
              <Loader2 className="w-3 h-3 animate-spin opacity-50" />
            </>
          ) : (
            entry.content
          )}
        </div>
      </div>
    )
  }

  return null
}

const ActivityLogViewer: React.FC<{ logs: ActivityLogEntry[] }> = ({ logs }) => {
  if (!logs || logs.length === 0) return null
  const sorted = [...logs].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))

  return (
    <div className="mt-4 mb-2 pt-2 border-t border-dashed border-border/30">
      <div className="text-[10px] uppercase font-bold text-muted-foreground/60 mb-2 pl-1 tracking-widest">
        Activity Log
      </div>
      <div className="space-y-2">
        {sorted.map((entry, idx) => (
          <ActivityEntryItem key={idx} entry={entry} />
        ))}
      </div>
    </div>
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
        {activeAgents.map(status => (
          <AgentStatusIndicator
            key={status.agent}
            agent={status.agent}
            status={status.status}
            message={status.message}
            details={status.details}
            startTime={status.startTime || 0} // Provide a default for startTime if it's optional in AgentStatusInfo
            config={
              agentConfig[status.agent] || {
                color: 'text-muted-foreground',
                bgColor: 'bg-muted/50 border-border',
                icon: <Bot className="w-4 h-4" />,
              }
            }
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

/**
 * Collapsible Delegation Chain
 * Groups technical delegation messages into an expandable section
 * NOTE: We never show "Processing..." here - the bottom indicator handles that
 */
const DelegationChain: React.FC<{ messages: Message[]; isComplete?: boolean }> = ({
  messages,
  isComplete = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (messages.length === 0) return null

  // Only show when complete - don't show "Processing" here (bottom indicator handles it)
  if (!isComplete) return null

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <CheckCircle2 className="w-3 h-3 text-green-500/50" />
        <span>Processed ({messages.length} steps)</span>
      </button>

      {isExpanded && (
        <div className="mt-2 ml-4 pl-3 border-l border-muted space-y-1">
          {messages.map((msg, idx) => {
            const agentName = msg.sender || msg.name || 'Unknown'
            const displayName = getAgentDisplayName(agentName)
            return (
              <div key={idx} className="text-xs text-muted-foreground py-1">
                <span className="font-medium">{displayName}:</span>{' '}
                <span className="opacity-70">
                  {msg.content.slice(0, 80)}
                  {msg.content.length > 80 ? '...' : ''}
                </span>
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
  onApproveAllActions?: (messageIndex: number) => void
  onClose?: () => void
  showThinking?: boolean
  children?: React.ReactNode
  ActionComponent?: React.ComponentType<{
    action: AgentAction
    agentName: string
    messageIndex: number
    actionIndex: number
  }>
  QuestionComponent?: React.ComponentType<{
    question: AgentQuestion
    onAnswer: (a: string | string[]) => void
    onSkip?: () => void
  }>
  // New props for enhanced UX
  activeAgents?: AgentStatusInfo[]
  showActiveAgents?: boolean
  isActivityPanelOpen?: boolean
  isSending?: boolean
  thinkingAgent?: string | null // Current agent that's processing
  /** Customizable thinking messages - defaults to DEFAULT_THINKING_MESSAGES */
  thinkingMessagesConfig?: ThinkingMessagesConfig
  /** Real-time streaming tokens for activity visualization */
  streamingTokens?: string
  /** Current phase for context */
  currentPhase?: string
  /** Active operations being tracked */
  activeOperations?: Array<{
    id: string
    type: string
    label: string
    startTime?: number
    tool?: string
  }>
  /** Project ID for entity reference resolution */
  projectId?: string
}

type GroupedMessage = {
  type: 'message' | 'delegation'
  messages: Message[]
  originalIndices: number[]
}

export const AgentLog: React.FC<AgentLogProps> = React.memo(({
  messages,
  agentConfig,
  onQuestionAnswer,
  onQuestionSkip,
  onApproveAllActions,
  onClose,
  showThinking = false,
  children,
  ActionComponent, // Optional injection for custom action rendering
  QuestionComponent, // Optional injection for custom question rendering
  activeAgents = [],
  showActiveAgents = true,
  isActivityPanelOpen = false,
  currentPhase,
  activeOperations = [],
  isSending = false,
  thinkingAgent,
  thinkingMessagesConfig = DEFAULT_THINKING_MESSAGES,
  streamingTokens,
  projectId,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [hasProcessed, setHasProcessed] = useState(false)
  const lastIsSending = useRef(isSending)
  const containerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const groupingCacheRef = useRef<{ messages: Message[]; groups: GroupedMessage[] } | null>(null)

  const [thinkingTime, setThinkingTime] = useState(0)

  // Detect current agent - prefer explicit thinkingAgent prop
  const currentAgent = React.useMemo(() => {
    if (!isSending) return null

    // Use explicit thinkingAgent if provided
    if (thinkingAgent && thinkingAgent !== 'RunnableSequence') {
      return thinkingAgent
    }

    // Try to get from active agents
    if (activeAgents.length > 0) {
      return activeAgents[activeAgents.length - 1]?.agent || null
    }

    // Fallback: get from last AI message
    for (let idx = messages.length - 1; idx >= 0; idx--) {
      const msg = messages[idx]
      if (msg.type === 'ai' && msg.sender) {
        return msg.sender
      }
    }
    return null
  }, [isSending, thinkingAgent, activeAgents, messages])

  // Track when processing finishes to show the "Done" marker
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (isSending) {
      setHasProcessed(false)
      setThinkingTime(0)
      interval = setInterval(() => {
        setThinkingTime(t => t + 1)
      }, 1000)
    } else if (lastIsSending.current && !isSending) {
      setHasProcessed(true)
    }
    lastIsSending.current = isSending
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isSending])

  // Track if user is near bottom of scroll
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    // Consider "near bottom" if within 100px of bottom
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100
  }

  // Only auto-scroll if user is near bottom (not reading history)
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeAgents, isSending, hasProcessed])

  const getAgentConfigLocal = (agentName: string): AgentConfig => {
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
      bgColor: 'bg-muted/10 border-border/20',
      icon: <Bot className="w-3.5 h-3.5" />,
    }
  }

  // Build chronological feed: groups follow messages array order (no reordering).
  // Each group is either a delegation chain or a single message; activity log is rendered at the bottom of each message block.
  const groupedMessages = useMemo(() => {
    const cached = groupingCacheRef.current
    if (cached?.messages === messages) {
      return cached.groups
    }

    const groups: GroupedMessage[] = []
    let currentDelegationChain: Message[] = []
    let currentDelegationIndices: number[] = []

    let startIndex = 0

    if (cached && messages.length >= cached.messages.length) {
      const isPrefixMatch = cached.messages.every((msg, idx) => msg === messages[idx])
      if (isPrefixMatch) {
        groups.push(...cached.groups)
        startIndex = cached.messages.length

        if (groups.length > 0 && groups[groups.length - 1]?.type === 'delegation') {
          const lastDelegationGroup = groups.pop()
          if (lastDelegationGroup) {
            currentDelegationChain = [...lastDelegationGroup.messages]
            currentDelegationIndices = [...lastDelegationGroup.originalIndices]
          }
        }
      }
    }

    messages.slice(startIndex).forEach((msg, offset) => {
      const originalIndex = startIndex + offset
      if (isDelegationMessage(msg)) {
        currentDelegationChain.push(msg)
        currentDelegationIndices.push(originalIndex)
      } else {
        if (currentDelegationChain.length > 0) {
          groups.push({
            type: 'delegation',
            messages: currentDelegationChain,
            originalIndices: currentDelegationIndices,
          })
          currentDelegationChain = []
          currentDelegationIndices = []
        }
        groups.push({
          type: 'message',
          messages: [msg],
          originalIndices: [originalIndex],
        })
      }
    })
    if (currentDelegationChain.length > 0) {
      groups.push({
        type: 'delegation',
        messages: currentDelegationChain,
        originalIndices: currentDelegationIndices,
      })
    }
    groupingCacheRef.current = { messages, groups }
    return groups
  }, [messages])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pb-4"
    >
      {/* Chronological message feed: messages then per-message activity (activity log at bottom of each block) */}
      {groupedMessages.map((group, groupIdx) => {
        // Strict Activity Filtering: Skip technical delegation if Activity is OFF
        if (group.type === 'delegation' && !isActivityPanelOpen) {
          return null
        }

        // Render delegation chain as collapsed
        if (group.type === 'delegation') {
          // Only show checkmark for completed chains. If it's the current one, it will show text,
          // and the global spinner at the bottom will handle the "working" visual.
          const isLastGroup = groupIdx === groupedMessages.length - 1
          const isCurrentlyWorking = isSending && isLastGroup
          return (
            <DelegationChain
              key={`delegation-${groupIdx}`}
              messages={group.messages}
              isComplete={!isCurrentlyWorking}
            />
          )
        }

        // Render regular message
        const msg = group.messages[0]

        const agentName = msg.sender || msg.name || 'Unknown'
        const displayName = getAgentDisplayName(agentName)
        const isHuman = msg.type === 'human' || agentName === 'User'
        const config = getAgentConfigLocal(agentName)

        // Skip pure JSON messages when Activity is OFF (but NEVER skip human messages)
        if (!isHuman && !isActivityPanelOpen && isPureJsonMessage(msg)) {
          return null
        }

        if (!isHuman && !msg.content?.trim() && !(msg.actions?.length) && !(msg.questions?.length) && !(msg.activityLog?.length) && msg.type !== 'consistency_check') {
          return null
        }

        return (
          <div
            key={groupIdx}
            className={cn(
              'text-sm animate-in fade-in slide-in-from-bottom-1 duration-300',
              isHuman ? 'ml-12' : 'mr-4'
            )}
          >
            {/* Agent Header - Minimalist */}
            {/* Always show agent header as requested */}
            <div
              className={cn(
                'flex items-center gap-2 mb-1.5',
                isHuman ? 'justify-end text-primary' : config.color
              )}
            >
              {!isHuman && (
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full transition-all duration-300',
                    config.bgColor || 'bg-muted/30 border border-border/20'
                  )}
                >
                  <div className="p-0.5 opacity-90">{config.icon}</div>
                  <span className="font-bold text-[10px] uppercase tracking-[0.15em]">
                    {displayName}
                  </span>
                </div>
              )}
              {isHuman && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  <span className="font-bold text-[10px] uppercase tracking-[0.15em]">You</span>
                  <div className="p-0.5 opacity-90">
                    <User className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}

              {!isHuman && msg.confidence !== undefined && isActivityPanelOpen && (
                <span className="text-[10px] text-muted-foreground/60 ml-auto font-mono">
                  {Math.round(msg.confidence * 100)}%
                </span>
              )}
            </div>

            {/* Thinking (if enabled and Activity is ON) */}
            {showThinking && msg.thinking && isActivityPanelOpen && (
              <div className="mb-3 p-2.5 rounded border border-dashed border-border/40 text-[11px] text-muted-foreground italic leading-relaxed bg-muted/5">
                <span className="font-semibold not-italic text-[10px] uppercase tracking-wider opacity-70">
                  Thinking:
                </span>{' '}
                {msg.thinking}
              </div>
            )}

            {/* Message Content - Minimalist (No background box) */}
            <div
              className={cn(
                'relative group leading-relaxed',
                isHuman
                  ? 'text-right text-foreground/90'
                  : 'text-foreground border-l-2 border-border/30 pl-4 py-0.5'
              )}
            >
              <MessageContent
                content={msg.content}
                isActivityPanelOpen={isActivityPanelOpen}
                hasActions={!!(msg.actions && msg.actions.length > 0)}
                projectId={projectId}
              />
              {/* Hover Actions - HIDE when activity is OFF */}
              {!isHuman && isActivityPanelOpen && <MessageHoverActions content={msg.content} />}
            </div>

            {/* Actions - ALWAYS show (approval is user-critical, not technical detail) */}
            {msg.actions && msg.actions.length > 0 && ActionComponent && (
              <div className={cn('mt-3 flex flex-wrap gap-2', isHuman ? 'justify-end' : 'pl-4')}>
                {msg.actions.length > 1 && onApproveAllActions && (
                  <button
                    onClick={() => onApproveAllActions(group.originalIndices[0])}
                    disabled={isSending}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors shadow-sm',
                      isSending && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Approve All ({msg.actions.length})
                  </button>
                )}
                {msg.actions.map((action, actionIdx) => (
                  <ActionComponent
                    key={`${actionIdx}-${action.status || 'pending'}`}
                    action={action}
                    agentName={displayName}
                    messageIndex={group.originalIndices[0]}
                    actionIndex={actionIdx}
                  />
                ))}
              </div>
            )}

            {/* Questions */}
            {msg.questions && msg.questions.length > 0 && QuestionComponent && (
              <div className={cn('mt-4 space-y-3', isHuman ? 'items-end' : 'pl-4')}>
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

            {/* Consistency Check Result */}
            {msg.type === 'consistency_check' && msg.consistencyResult && (
              <div className={cn('mt-4', isHuman ? 'items-end' : 'pl-4')}>
                <ConsistencyMessage result={msg.consistencyResult} canUndo={true} />
              </div>
            )}

            {/* Persistent Activity Log for this message */}
            {isActivityPanelOpen && msg.activityLog && msg.activityLog.length > 0 && (
              <div className="w-full max-w-[85%] mt-4 animate-in fade-in zoom-in-95 duration-300 origin-top-left">
                <ActivityLogViewer logs={msg.activityLog} />
              </div>
            )}
          </div>
        )
      })}

      {/* Activity panel at bottom: live agents + status (chronological feed ends above, activity always at bottom) */}
      {showActiveAgents && isActivityPanelOpen && activeAgents.length > 0 && (
        <ActiveAgentsPanel activeAgents={activeAgents} agentConfig={agentConfig} />
      )}

      {/* Status Indicators - Enhanced */}
      <div className="mt-4 border-t border-border/10 pt-3 px-2">
        {isSending ? (
          <div className="space-y-2">
            {/* Enhanced Activity Details Panel (Activity ON) */}
            {isActivityPanelOpen && (
              <div className="mb-3 space-y-2">
                {/* Phase & Status Header */}
                <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded-md border border-border/30">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      {currentPhase || 'Processing'}
                    </span>
                  </div>
                  {activeOperations.length > 0 && (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground/80 truncate max-w-[200px]">
                        {activeOperations.map(op => op.label).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Active Operations List */}
                {activeOperations.length > 0 && (
                  <div className="space-y-1 pl-2 border-l-2 border-primary/30">
                    {activeOperations.map(op => (
                      <div key={op.id} className="flex items-center gap-2 text-[10px] py-1">
                        <Loader2 className="w-3 h-3 animate-spin text-primary/70" />
                        <span className="text-foreground/80 font-medium">{op.label}</span>
                        {op.tool && (
                          <span className="text-muted-foreground font-mono text-[9px]">
                            → {op.tool}
                          </span>
                        )}
                        {op.startTime && (
                          <span className="text-muted-foreground/60 ml-auto font-mono text-[9px]">
                            {Math.round((Date.now() - op.startTime) / 1000)}s
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Live Streaming Tokens (Activity ON) */}
            {isActivityPanelOpen && streamingTokens && (
              <div className="mb-2 p-3 rounded-md bg-black/90 border border-green-500/30 text-[10px] font-mono shadow-inner animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 mb-1.5 border-b border-white/10 pb-1">
                  <span className="text-green-500 font-bold uppercase tracking-widest animate-pulse">
                    ● Live Stream
                  </span>
                  <span className="ml-auto text-muted-foreground/50">
                    {(streamingTokens.length / 1024).toFixed(1)}kb
                  </span>
                </div>
                <div className="text-green-400/90 whitespace-pre-wrap break-words leading-relaxed max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-green-900/50 scrollbar-track-transparent">
                  {streamingTokens}
                  <span className="inline-block w-1.5 h-3 ml-0.5 bg-green-500 animate-pulse align-middle" />
                </div>
              </div>
            )}

            {/* Current Agent Indicator - Always show detailed view if agent is active */}
            {currentAgent ? (
              <div className="flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg px-3 py-2 shadow-sm flex-1">
                  <div className="relative">
                    {getAgentConfigLocal(currentAgent).icon}
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-ping" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">
                      {getAgentDisplayName(currentAgent)}
                    </div>
                    <div className="text-[9px] text-muted-foreground font-medium">
                      {getThinkingMessage(thinkingMessagesConfig, thinkingTime, true)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {thinkingTime}s
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback generic processing indicator */
              <div className="flex items-center gap-2 text-primary/70 text-[10px] uppercase tracking-widest font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{getThinkingMessage(thinkingMessagesConfig, thinkingTime, false)}</span>
              </div>
            )}
          </div>
        ) : hasProcessed && isActivityPanelOpen ? (
          <div className="flex items-center gap-2 text-green-500/60 text-[10px] uppercase tracking-widest font-medium animate-in fade-in slide-in-from-bottom-1 duration-500">
            <div className="relative">
              <Check className="w-3 h-3" />
              <div className="absolute inset-0 bg-green-500/30 blur-sm animate-pulse" />
            </div>
            <span>{thinkingMessagesConfig.completeMessage}</span>
          </div>
        ) : null}
      </div>

      {children}

      <div ref={bottomRef} />
    </div>
  )
})

AgentLog.displayName = 'AgentLog'

// ============================================
// Message Content - Renders markdown with react-markdown
// ============================================

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
const CollapsibleJSON: React.FC<{ data: Record<string, unknown>; defaultExpanded?: boolean }> = ({
  data,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-border/20 rounded bg-muted/5 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span className="uppercase tracking-wider font-medium">Technical Data</span>
        <span className="ml-auto text-[9px] opacity-50">
          {isExpanded ? 'Click to collapse' : 'Click to expand'}
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-border/20 bg-background/50">
          <pre className="px-3 py-2 text-[10px] overflow-x-auto max-h-[500px] overflow-y-auto whitespace-pre-wrap font-mono text-muted-foreground/70 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

const MessageContent: React.FC<{
  content: string
  isActivityPanelOpen?: boolean
  hasActions?: boolean
  projectId?: string
}> = ({ content, isActivityPanelOpen = false, hasActions = false, projectId }) => {
  // Check if content is JSON and extract message field
  let displayContent = content

  // Debug content rendering
  /*
  useEffect(() => {
    if (content.trim().startsWith('{') || !content) {
      console.log('[MessageContent] Processing content:', {
        contentPreview: content?.slice(0, 50),
        isJSON: content.trim().startsWith('{'),
        isActivityPanelOpen
      })
    }
  }, [content, isActivityPanelOpen])
  */

  // Try to parse JSON if it looks like it
  if (content.trim().startsWith('{')) {
    let parsedData: Record<string, unknown> | null = null
    try {
      parsedData = JSON.parse(content)
    } catch {
      // Not valid JSON, might be streaming
      const messageMatch = content.match(/"message"\s*:\s*"([^"]*)"?/)
      if (messageMatch) {
        displayContent = messageMatch[1]
      } else if (!isActivityPanelOpen) {
        return null
      }
    }

    if (parsedData) {
      if (parsedData.message && typeof parsedData.message === 'string') {
        displayContent = parsedData.message

        if (isActivityPanelOpen && hasActions) {
          return (
            <>
              <div className="mb-3">{parseMessageContent(displayContent, projectId)}</div>
              <CollapsibleJSON data={parsedData} defaultExpanded={true} />
            </>
          )
        }
      } else {
        if (!isActivityPanelOpen) {
          return null
        }
        return <CollapsibleJSON data={parsedData} defaultExpanded={false} />
      }
    }
  }

  return parseMessageContent(displayContent, projectId)
}

// Helper component that wraps text with entity reference support
const TextWithReferences: React.FC<{ children: React.ReactNode; projectId?: string }> = ({
  children,
  projectId,
}) => {
  // Convert children to string if possible
  const text = React.Children.toArray(children)
    .map(child => (typeof child === 'string' ? child : ''))
    .join('')

  // If no references or no projectId, render as-is
  if (!text || !hasReferences(text)) {
    return <>{children}</>
  }

  // Use ReferenceText for content with entity references
  return <ReferenceText text={text} projectId={projectId} inline />
}

// Helper to parse message content with markdown
function parseMessageContent(content: string, projectId?: string) {
  // Custom rendering for delegation messages (shouldn't show normally due to collapsing)
  if (content.includes('Delegating to')) {
    const toolName = content.replace('Delegating to', '').trim().replace('...', '')
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

  // Check if content has entity references
  const contentHasRefs = hasReferences(content)

  // Pre-process: convert entity refs [Name][id] to markdown links [Name](#entity/id)
  // so ReactMarkdown doesn't mangle them as broken reference-style links
  const processedContent = contentHasRefs
    ? content.replace(/\[([^\]]+)\]\[([^\]\s]+)\]/g, '[$1](#entity/$2)')
    : content

  // Use react-markdown for proper markdown rendering
  return (
    <ReactMarkdown
      components={{
        // Headers
        h1: ({ children }) => (
          <h1 className="font-bold text-xl text-foreground mt-4 mb-2">
            {contentHasRefs ? (
              <TextWithReferences projectId={projectId}>{children}</TextWithReferences>
            ) : (
              children
            )}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-bold text-lg text-foreground mt-3 mb-1.5">
            {contentHasRefs ? (
              <TextWithReferences projectId={projectId}>{children}</TextWithReferences>
            ) : (
              children
            )}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-semibold text-base text-foreground mt-2 mb-1">
            {contentHasRefs ? (
              <TextWithReferences projectId={projectId}>{children}</TextWithReferences>
            ) : (
              children
            )}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="font-medium text-sm text-foreground/90 mt-1.5">
            {contentHasRefs ? (
              <TextWithReferences projectId={projectId}>{children}</TextWithReferences>
            ) : (
              children
            )}
          </h4>
        ),

        // Paragraphs
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">
            {contentHasRefs ? (
              <TextWithReferences projectId={projectId}>{children}</TextWithReferences>
            ) : (
              children
            )}
          </p>
        ),

        // Lists
        ul: ({ children }) => <ul className="space-y-1 pl-1 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="space-y-1 pl-1 mb-2">{children}</ol>,
        li: ({ children }) => (
          <li className="flex gap-2">
            <span className="text-primary shrink-0">•</span>
            <span className="flex-1">
              {contentHasRefs ? (
                <TextWithReferences projectId={projectId}>{children}</TextWithReferences>
              ) : (
                children
              )}
            </span>
          </li>
        ),

        // Inline formatting
        strong: ({ children }) => (
          <strong className="font-bold">
            {contentHasRefs ? (
              <TextWithReferences projectId={projectId}>{children}</TextWithReferences>
            ) : (
              children
            )}
          </strong>
        ),
        em: ({ children }) => (
          <em className="italic text-muted-foreground">
            {contentHasRefs ? (
              <TextWithReferences projectId={projectId}>{children}</TextWithReferences>
            ) : (
              children
            )}
          </em>
        ),

        // Links - also handles entity references converted to #entity/id format
        a: ({ href, children }) => {
          if (href?.startsWith('#entity/')) {
            const refId = href.replace('#entity/', '')
            const displayName = typeof children === 'string' ? children
              : React.Children.toArray(children).map(c => typeof c === 'string' ? c : '').join('')
            // Render as entity reference chip via ReferenceText
            return (
              <ReferenceText
                text={`[${displayName}][${refId}]`}
                projectId={projectId}
                inline
              />
            )
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          )
        },

        // Code
        code: ({ children, className, inline, ...props }: any) => {
          const isBlock = className?.includes('language-')
          return isBlock ? (
            <pre className="bg-muted/50 rounded p-2 overflow-x-auto my-2">
              <code className="text-sm font-mono">{children}</code>
            </pre>
          ) : (
            <code className="bg-muted/50 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
          )
        },
        pre: ({ children }) => <>{children}</>,

        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground my-2">
            {contentHasRefs ? (
              <TextWithReferences projectId={projectId}>{children}</TextWithReferences>
            ) : (
              children
            )}
          </blockquote>
        ),

        // Horizontal rule
        hr: () => <hr className="border-border my-3" />,
      }}
    >
      {processedContent}
    </ReactMarkdown>
  )
}
