'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, X, RefreshCw } from 'lucide-react'
import { getChatStateAge } from '@/lib/chat-persistence'

interface ChatRehydrationBannerProps {
  persistKey: string
  messageCount: number
  onContinue: () => void
  onStartFresh: () => void
}

export const ChatRehydrationBanner: React.FC<ChatRehydrationBannerProps> = ({
  persistKey,
  messageCount,
  onContinue,
  onStartFresh,
}) => {
  const age = getChatStateAge(persistKey)
  const ageText = age ? formatAge(age) : 'recently'

  return (
    <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-blue-500/20">
          <MessageCircle className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm text-blue-400 mb-1">💬 Previous Conversation Found</div>
          <div className="text-xs text-muted-foreground mb-3">
            Last activity: {ageText} • {messageCount} message{messageCount > 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onContinue}
              className="gap-2 bg-blue-500 hover:bg-blue-600 text-white h-8"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Continue
            </Button>
            <Button size="sm" variant="outline" onClick={onStartFresh} className="gap-2 h-8">
              <X className="w-3.5 h-3.5" />
              Start Fresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'} ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} hour${hours === 1 ? '' : 's'} ago`
}

export default ChatRehydrationBanner
