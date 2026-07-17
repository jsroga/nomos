'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/Button'

interface LoopChatEmptyStateProps {
  onCreateLoop: () => void
}

export function LoopChatEmptyState({ onCreateLoop }: LoopChatEmptyStateProps) {
  return (
    <div className="mt-4 px-4 pb-4">
      <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-sm text-muted-foreground mb-2">
          Create a loop to start chatting with AI
        </p>
        <Button size="sm" variant="outline" onClick={onCreateLoop} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Create Loop
        </Button>
      </div>
    </div>
  )
}
