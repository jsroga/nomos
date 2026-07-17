'use client'

import React from 'react'
import { Activity, FlaskConical, Loader2 } from 'lucide-react'
import { Button } from '@/components/Button'

interface ChatInterfaceHeaderProps {
  title?: string
  headerContent?: React.ReactNode
  isActivityPanelOpen?: boolean
  onActivityToggle?: () => void
  isEvalEnabled: boolean
  isEvaluating: boolean
  evalResult: { score: number } | null
  onRunEvaluation: () => void
  messageCount: number
}

export function ChatInterfaceHeader({
  title,
  headerContent,
  isActivityPanelOpen = false,
  onActivityToggle,
  isEvalEnabled,
  isEvaluating,
  evalResult,
  onRunEvaluation,
  messageCount,
}: ChatInterfaceHeaderProps) {
  return (
    <div className="px-4 py-3 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between sticky top-0 z-20 min-h-[56px]">
      <div className="flex items-center gap-3">
        {headerContent}
        {title && (
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            {title}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onActivityToggle && (
          <Button
            variant={isActivityPanelOpen ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onActivityToggle}
            className="h-8 gap-2 text-xs font-medium border border-border/40"
            title={
              isActivityPanelOpen
                ? 'Activity ON - showing technical details'
                : 'Activity OFF - showing results only'
            }
          >
            <Activity
              size={14}
              className={isActivityPanelOpen ? 'text-primary' : 'text-muted-foreground'}
            />
            <span className={isActivityPanelOpen ? 'text-foreground' : 'text-muted-foreground'}>
              Activity {isActivityPanelOpen ? 'ON' : 'OFF'}
            </span>
          </Button>
        )}

        {isEvalEnabled && (
          <Button
            variant={evalResult ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onRunEvaluation}
            disabled={isEvaluating || messageCount === 0}
            className="group h-8 gap-2 text-xs font-medium text-purple-400 border border-purple-500/40 hover:bg-purple-500 hover:text-white hover:border-purple-500 transition-colors duration-200"
            title="Run LLM-as-Judge evaluation on this conversation"
          >
            {isEvaluating ? (
              <Loader2 size={14} className="animate-spin text-purple-400 group-hover:text-white transition-colors duration-200" />
            ) : (
              <FlaskConical size={14} className="text-purple-400 group-hover:text-white transition-colors duration-200" />
            )}
            <span className="text-purple-400 group-hover:text-white transition-colors duration-200">
              {isEvaluating
                ? 'Evaluating...'
                : evalResult
                  ? `Score: ${evalResult.score}/10`
                  : 'Eval'}
            </span>
          </Button>
        )}
      </div>
    </div>
  )
}
