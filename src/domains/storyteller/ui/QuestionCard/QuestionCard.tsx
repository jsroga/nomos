'use client'

'use client'

'use client'

import React from 'react'
import { Button } from '@/components/Button'
import { Textarea } from '@/components/Textarea'
import { cn } from '@/shared/data/utils'
import { AgentQuestion, QuestionOption } from '@/domains/storyteller/core/types/action-types'
import { QuestionType, QuestionUrgency } from '@/domains/storyteller/core/types/enums'
import {
  QUESTION_URGENCY_BADGE,
  QUESTION_URGENCY_BORDER_CLASS,
} from '@/domains/storyteller/ui/QuestionCard/constants/question-card-display'
import { QuestionCardHeader } from './QuestionCardHeader'
import { QuestionOptionButton } from './QuestionOptionButton'
import { useQuestionCardState } from './useQuestionCardState'
import { ChevronRight } from 'lucide-react'

interface QuestionCardProps {
  question: AgentQuestion
  onAnswer: (answer: string | string[]) => void
  onSkip?: () => void
  disabled?: boolean
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onAnswer,
  onSkip,
  disabled = false,
}) => {
  const {
    selectedOptions,
    freeText,
    timeLeft,
    handleOptionClick,
    handleSubmit,
    setFreeText,
    canSubmit,
    qType,
  } = useQuestionCardState({ question, onAnswer, disabled })

  const urgency = question.urgency || QuestionUrgency.IMPORTANT
  const currentUrgencyColor =
    QUESTION_URGENCY_BORDER_CLASS[urgency] || QUESTION_URGENCY_BORDER_CLASS[QuestionUrgency.IMPORTANT]
  const currentUrgencyBadge =
    QUESTION_URGENCY_BADGE[urgency] || QUESTION_URGENCY_BADGE[QuestionUrgency.IMPORTANT]

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4 transition-all',
        currentUrgencyColor,
        disabled && 'opacity-50'
      )}
    >
      <QuestionCardHeader
        agentName={question.agentName}
        timeLeft={timeLeft}
        urgencyBadge={currentUrgencyBadge}
      />

      <p className="text-base font-medium mb-2">
        {question.question || 'What would you like to do next?'}
      </p>

      {question.context && (
        <p className="text-sm text-muted-foreground mb-4 italic">{question.context}</p>
      )}

      {question.options && question.options.length > 0 && (
        <div className="space-y-2 mb-4">
          {question.options.map((option: QuestionOption) => (
            <QuestionOptionButton
              key={option.id}
              option={option}
              selected={selectedOptions.includes(option.id)}
              onClick={() => handleOptionClick(option.id)}
              disabled={disabled}
              isMultiple={qType === QuestionType.MULTIPLE_CHOICE}
            />
          ))}
        </div>
      )}

      {qType === QuestionType.FREE_TEXT && (
        <div className="mb-4">
          <Textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            placeholder="Type your response..."
            className="min-h-[100px] bg-background/50"
            disabled={disabled}
          />
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div>
          {onSkip && question.urgency !== QuestionUrgency.BLOCKING && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              disabled={disabled}
              className="text-muted-foreground"
            >
              Skip
            </Button>
          )}
        </div>
        <Button onClick={handleSubmit} disabled={!canSubmit || disabled} size="sm" className="gap-1">
          Submit Answer
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
