'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, Play, X } from 'lucide-react'

interface StreamInterruptedBannerProps {
  agent: string
  task: string
  onResume: () => void
  onDismiss: () => void
}

export const StreamInterruptedBanner: React.FC<StreamInterruptedBannerProps> = ({
  agent,
  task,
  onResume,
  onDismiss,
}) => {
  return (
    <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-amber-500/20">
          <AlertCircle className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm text-amber-400 mb-1">⚠️ Stream Interrupted</div>
          <div className="text-xs text-muted-foreground mb-1">
            <span className="font-medium">{agent}</span> was working on: {task}
          </div>
          <div className="text-[11px] text-muted-foreground/70 mb-3 italic">
            Page was reloaded while agent was processing
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onResume}
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-white h-8"
            >
              <Play className="w-3.5 h-3.5" />
              Resume
            </Button>
            <Button size="sm" variant="outline" onClick={onDismiss} className="gap-2 h-8">
              <X className="w-3.5 h-3.5" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StreamInterruptedBanner
