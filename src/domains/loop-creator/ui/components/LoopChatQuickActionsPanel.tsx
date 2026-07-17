'use client'

import React from 'react'
import { SmartQuickActions } from '@/shared/chat'

interface LoopChatQuickActionsPanelProps {
  showQuickActions: boolean
  quickActionsTourId: string
  onSendMessage: (message: string) => void
}

export function LoopChatQuickActionsPanel({
  showQuickActions,
  quickActionsTourId,
  onSendMessage,
}: LoopChatQuickActionsPanelProps) {
  return (
    <div id={quickActionsTourId} className="mt-4 border-t border-border/10 pt-4 px-4 pb-2">
      {showQuickActions ? (
        <>
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest">
              Suggested
            </span>
          </div>
          <SmartQuickActions
            currentPhase="loop_design"
            onSendMessage={onSendMessage}
            proposeLabel="Analyze loops"
            proposePrompt="Analyze the current game loops and suggest improvements or next steps."
          />
        </>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-muted-foreground">
            Quick actions appear when a loop is selected
          </p>
        </div>
      )}
    </div>
  )
}
