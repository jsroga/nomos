'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { AgentAction, AgentQuestion } from '../actions/types'
import { ActionCommitted } from './ActionToast'
import QuestionCard from './QuestionCard'
import { Bot, User, Sparkles, Brain, Lightbulb, Scale, Eye, Pen } from 'lucide-react'

export interface Message {
  sender?: string
  name?: string
  content: string
  type?: 'human' | 'ai'
  actions?: AgentAction[]
  questions?: AgentQuestion[]
  thinking?: string
  confidence?: number
}

interface AgentLogProps {
  messages: Message[]
  onQuestionAnswer?: (questionId: string, answer: string | string[]) => void
  onQuestionSkip?: (questionId: string) => void
  showThinking?: boolean
  children?: React.ReactNode
}

// Agent configuration with colors and icons
const AGENT_CONFIG: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  Showrunner: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
    icon: <Sparkles className="w-4 h-4" />,
  },
  PlotArchitect: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    icon: <Lightbulb className="w-4 h-4" />,
  },
  CharacterPsychology: {
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    icon: <Brain className="w-4 h-4" />,
  },
  ConsequenceTracker: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/30',
    icon: <Bot className="w-4 h-4" />,
  },
  DevilsAdvocate: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
    icon: <Scale className="w-4 h-4" />,
  },
  VisualMoment: {
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
    icon: <Eye className="w-4 h-4" />,
  },
  Writer: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
    icon: <Pen className="w-4 h-4" />,
  },
  User: {
    color: 'text-primary',
    bgColor: 'bg-primary/10 border-primary/30',
    icon: <User className="w-4 h-4" />,
  },
}

const getAgentConfig = (agentName: string) => {
  return (
    AGENT_CONFIG[agentName] || {
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50 border-border',
      icon: <Bot className="w-4 h-4" />,
    }
  )
}

export const AgentLog: React.FC<AgentLogProps> = ({
  messages,
  onQuestionAnswer,
  onQuestionSkip,
  showThinking = false,
  children,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      {messages.map((msg, idx) => {
        const agentName = msg.sender || msg.name || 'Unknown'
        const isHuman = msg.type === 'human' || agentName === 'User'
        const config = getAgentConfig(agentName)

        return (
          <div key={idx} className={cn('text-sm', isHuman ? 'ml-8' : 'mr-4')}>
            {/* Agent Header */}
            <div className={cn('flex items-center gap-2 mb-1', config.color)}>
              <div className={cn('p-1 rounded', config.bgColor.split(' ')[0])}>{config.icon}</div>
              <span className="font-bold text-xs uppercase tracking-wider">{agentName}</span>
              {msg.confidence !== undefined && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {Math.round(msg.confidence * 100)}% confident
                </span>
              )}
            </div>

            {/* Thinking (if enabled) */}
            {showThinking && msg.thinking && (
              <div className="mb-2 p-2 rounded bg-muted/30 border border-dashed border-muted text-xs text-muted-foreground italic">
                <span className="font-semibold">💭 Thinking:</span> {msg.thinking}
              </div>
            )}

            {/* Message Content */}
            <div className={cn('p-3 rounded-lg border', config.bgColor, 'text-foreground')}>
              <MessageContent content={msg.content} />
            </div>

            {/* Actions */}
            {msg.actions && msg.actions.length > 0 && (
              <div className="mt-2 space-y-2">
                {msg.actions.map((action, actionIdx) => (
                  <ActionCommitted
                    key={actionIdx}
                    entry={{
                      id: `${idx}-${actionIdx}`,
                      timestamp: new Date(),
                      agentName,
                      action,
                      status: 'committed',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Questions */}
            {msg.questions && msg.questions.length > 0 && (
              <div className="mt-3 space-y-3">
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
// Message Content - Renders markdown-like content
// ============================================

const MessageContent: React.FC<{ content: string }> = ({ content }) => {
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

  // Custom rendering for delegation messages
  if (displayContent.includes('Delegating to')) {
    const toolName = displayContent.replace('Delegating to', '').trim().replace('...', '')
    const friendlyName = toolName
      .replace('delegate_to_', '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    return (
      <div className="flex items-center gap-2 text-muted-foreground italic">
        <span className="text-primary">→</span>
        <span>Delegating task to <span className="font-semibold text-primary">{friendlyName}</span>...</span>
      </div>
    )
  }

  // Simple markdown-like rendering
  const lines = displayContent.split('\n')

  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <p key={idx} className="font-bold">
              {line.slice(2, -2)}
            </p>
          )
        }

        // Bold sections
        const boldPattern = /\*\*(.+?)\*\*/g
        const parts = []
        let lastIndex = 0
        let match

        while ((match = boldPattern.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push(line.slice(lastIndex, match.index))
          }
          parts.push(<strong key={match.index}>{match[1]}</strong>)
          lastIndex = match.index + match[0].length
        }

        if (lastIndex < line.length) {
          parts.push(line.slice(lastIndex))
        }

        // Empty lines become breaks
        if (line.trim() === '') {
          return <br key={idx} />
        }

        // List items
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <p key={idx} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{line.slice(2)}</span>
            </p>
          )
        }

        // Numbered items
        const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/)
        if (numberedMatch) {
          return (
            <p key={idx} className="flex gap-2">
              <span className="text-primary font-medium">{numberedMatch[1]}.</span>
              <span>{numberedMatch[2]}</span>
            </p>
          )
        }

        return <p key={idx}>{parts.length > 0 ? parts : line}</p>
      })}
    </div>
  )
}

export default AgentLog
