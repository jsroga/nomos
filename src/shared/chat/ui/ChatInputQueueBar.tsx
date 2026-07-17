'use client'

import React from 'react'
import { X } from 'lucide-react'

interface ChatInputQueueBarProps {
  pendingQueue: string[]
  onRemove: (index: number) => void
}

export function ChatInputQueueBar({ pendingQueue, onRemove }: ChatInputQueueBarProps) {
  if (pendingQueue.length === 0) return null

  return (
    <div className="px-4 py-2 border-b border-border/30 bg-muted/20 animate-in slide-in-from-bottom-1 duration-200">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          Queued
        </span>
        <span className="text-[10px] text-muted-foreground/50 font-mono">
          ({pendingQueue.length})
        </span>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground/50">Double ↵ to send all</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pendingQueue.map((msg, idx) => (
          <div
            key={idx}
            className="group flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-foreground/80 max-w-[200px]"
          >
            <span className="truncate">{msg.length > 30 ? msg.slice(0, 30) + '...' : msg}</span>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="opacity-50 hover:opacity-100 transition-opacity p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
