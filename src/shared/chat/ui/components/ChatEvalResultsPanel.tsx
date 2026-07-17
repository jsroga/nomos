'use client'

import React from 'react'
import { FlaskConical } from 'lucide-react'

interface ChatEvalResultsPanelProps {
  evalResult: {
    score: number
    feedback: string
    criteria: Record<string, { score: number; comment: string }>
  }
  onDismiss: () => void
}

export function ChatEvalResultsPanel({ evalResult, onDismiss }: ChatEvalResultsPanelProps) {
  return (
    <div className="px-4 py-3 border-b bg-purple-500/5 border-purple-500/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-purple-400" />
          <span className="text-sm font-semibold text-purple-400">Mastra Scorer Evaluation</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="col-span-2 p-2 rounded bg-background/50 border border-border/30">
          <div className="font-medium text-foreground mb-1">
            Overall Score: {evalResult.score}/10
          </div>
          <p className="text-muted-foreground">{evalResult.feedback}</p>
        </div>
        {Object.entries(evalResult.criteria).map(([key, value]) => (
          <div key={key} className="p-2 rounded bg-background/30 border border-border/20">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>
              <span
                className={`font-mono ${value.score >= 7 ? 'text-green-400' : value.score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}
              >
                {value.score}/10
              </span>
            </div>
            <p className="text-muted-foreground text-[10px]">{value.comment}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
