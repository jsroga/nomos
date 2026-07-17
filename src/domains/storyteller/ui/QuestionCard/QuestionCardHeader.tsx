import React from 'react'
import { MessageCircleQuestion, Clock } from 'lucide-react'
import { cn } from '@/shared/data/utils'

interface QuestionCardHeaderProps {
  agentName?: string
  timeLeft: number | null
  urgencyBadge: { color: string; text: string }
}

export const QuestionCardHeader: React.FC<QuestionCardHeaderProps> = ({
  agentName,
  timeLeft,
  urgencyBadge,
}) => (
  <div className="flex items-start justify-between mb-3">
    <div className="flex items-center gap-2">
      <MessageCircleQuestion className="w-5 h-5 text-primary" />
      <span className="font-semibold text-sm">{agentName || 'Agent'} asks:</span>
    </div>
    <div className="flex items-center gap-2">
      {timeLeft !== null && timeLeft > 0 && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {timeLeft}s
        </span>
      )}
      <span className={cn('text-xs px-2 py-0.5 rounded-full', urgencyBadge.color)}>
        {urgencyBadge.text}
      </span>
    </div>
  </div>
)
