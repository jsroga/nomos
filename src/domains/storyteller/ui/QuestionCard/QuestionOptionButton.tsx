import React from 'react'
import { cn } from '@/shared/data/utils'
import { QuestionOption } from '@/domains/storyteller/core/types/action-types'
import { Check, Star, ChevronRight } from 'lucide-react'

interface QuestionOptionButtonProps {
  option: QuestionOption
  selected: boolean
  onClick: () => void
  disabled: boolean
  isMultiple: boolean
}

export const QuestionOptionButton: React.FC<QuestionOptionButtonProps> = ({
  option,
  selected,
  onClick,
  disabled,
  isMultiple,
}) => (
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
