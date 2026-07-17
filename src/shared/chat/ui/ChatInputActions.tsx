'use client'

import React from 'react'
import { Button } from '@/components/Button'
import { Command, CornerDownLeft, Send, StopCircle } from 'lucide-react'
import { cn } from '@/shared/data/utils'

interface ChatInputActionsProps {
  isSending: boolean
  hasQueue: boolean
  canSend: boolean
  onStop?: () => void
  onFlushQueue: () => void
  onSendOrQueue: () => void
}

export function ChatInputActions({
  isSending,
  hasQueue,
  canSend,
  onStop,
  onFlushQueue,
  onSendOrQueue,
}: ChatInputActionsProps) {
  return (
    <div className="absolute right-2 bottom-2 flex items-center gap-1">
      {isSending && onStop && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onStop}
          className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10"
          title="Stop generating"
        >
          <StopCircle className="h-3.5 w-3.5" />
        </Button>
      )}

      {hasQueue ? (
        <Button
          type="button"
          size="icon"
          onClick={onFlushQueue}
          className="h-8 w-8 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
          title="Send all queued messages"
        >
          <CornerDownLeft className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          onClick={onSendOrQueue}
          disabled={!canSend}
          className={cn(
            'h-8 w-8 rounded-full shadow-lg transition-all',
            isSending
              ? 'bg-muted/50 text-foreground border border-border/50 hover:bg-muted'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105'
          )}
          title={isSending ? 'Add to queue' : 'Send message'}
        >
          {isSending ? <Command className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </Button>
      )}
    </div>
  )
}
