'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Textarea } from '@/components/Textarea'
import { cn } from '@/shared/data/utils'
import { AgentQuestion, QuestionOption } from '@/domains/storyteller/core/types/action-types'
import { QuestionType, QuestionUrgency } from '@/domains/storyteller/core/types/enums'
import {
  QUESTION_URGENCY_BADGE,
  QUESTION_URGENCY_BORDER_CLASS,
} from '@/domains/storyteller/ui/QuestionCard/constants/question-card-display'
import { Check, MessageCircleQuestion, Clock, Star, ChevronRight } from 'lucide-react'

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
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const [timeLeft, setTimeLeft] = useState<number | null>(question.timeout || null)

  // Timeout countdown
  useEffect(() => {
    if (!question.timeout || disabled) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval)
          // Auto-submit default if timeout
          if (question.defaultOption) {
            onAnswer(question.defaultOption)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [question.timeout, question.defaultOption, onAnswer, disabled])

  const handleOptionClick = (optionId: string) => {
    if (disabled) return

    const qType = question.questionType || QuestionType.SINGLE_CHOICE

    if (qType === QuestionType.MULTIPLE_CHOICE) {
      setSelectedOptions(prev =>
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      )
    } else {
      // single_choice, confirmation, or any other type - single selection
      setSelectedOptions([optionId])
    }
  }

  const handleSubmit = () => {
    if (disabled) return

    const qType = question.questionType || QuestionType.SINGLE_CHOICE

    if (qType === QuestionType.FREE_TEXT) {
      onAnswer(freeText)
    } else if (selectedOptions.length > 0) {
      onAnswer(qType === QuestionType.MULTIPLE_CHOICE ? selectedOptions : selectedOptions[0])
    }
  }

  const qType = question.questionType || QuestionType.SINGLE_CHOICE
  const canSubmit =
    (qType === QuestionType.FREE_TEXT && freeText.trim().length > 0) || selectedOptions.length > 0

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
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">{question.agentName || 'Agent'} asks:</span>
        </div>
        <div className="flex items-center gap-2">
          {timeLeft !== null && timeLeft > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {timeLeft}s
            </span>
          )}
          <span className={cn('text-xs px-2 py-0.5 rounded-full', currentUrgencyBadge.color)}>
            {currentUrgencyBadge.text}
          </span>
        </div>
      </div>

      {/* Question */}
      <p className="text-base font-medium mb-2">
        {question.question || 'What would you like to do next?'}
      </p>

      {/* Context */}
      {question.context && (
        <p className="text-sm text-muted-foreground mb-4 italic">{question.context}</p>
      )}

      {/* Options */}
      {question.options && question.options.length > 0 && (
        <div className="space-y-2 mb-4">
          {question.options.map(option => (
            <OptionButton
              key={option.id}
              option={option}
              selected={selectedOptions.includes(option.id)}
              onClick={() => handleOptionClick(option.id)}
              disabled={disabled}
              isMultiple={question.questionType === 'multiple_choice'}
            />
          ))}
        </div>
      )}

      {/* Free text input */}
      {question.questionType === 'free_text' && (
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

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div>
          {onSkip && question.urgency !== 'blocking' && (
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
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || disabled}
          size="sm"
          className="gap-1"
        >
          Submit Answer
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ============================================
// Option Button Component
// ============================================

interface OptionButtonProps {
  option: QuestionOption
  selected: boolean
  onClick: () => void
  disabled: boolean
  isMultiple: boolean
}

const OptionButton: React.FC<OptionButtonProps> = ({
  option,
  selected,
  onClick,
  disabled,
  isMultiple,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left p-3 rounded-lg border-2 transition-all',
        'hover:border-primary/50 hover:bg-primary/5',
        selected ? 'border-primary bg-primary/10' : 'border-border/50 bg-background/30',
        disabled && 'cursor-not-allowed'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Selection indicator */}
        <div
          className={cn(
            'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
            selected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
            isMultiple && 'rounded-md'
          )}
        >
          {selected && <Check className="w-3 h-3 text-primary-foreground" />}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{option.label}</span>
            {option.recommended && (
              <span className="flex items-center gap-1 text-xs text-yellow-500">
                <Star className="w-3 h-3 fill-yellow-500" />
                Recommended
              </span>
            )}
          </div>
          {option.description && (
            <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
          )}
          {option.consequence && (
            <p className="text-xs text-primary/80 mt-1 flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              {option.consequence}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
