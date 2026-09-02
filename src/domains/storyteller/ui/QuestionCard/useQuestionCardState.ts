import { useState } from 'react'
import { AgentQuestion } from '@/domains/storyteller/core/types/action-types'
import { QuestionType } from '@/domains/storyteller/core/types/enums'

interface UseQuestionCardStateParams {
  question: AgentQuestion
  onAnswer: (answer: string | string[], additionalFeedback?: string) => void
  disabled: boolean
}

export const useQuestionCardState = ({
  question,
  onAnswer,
  disabled,
}: UseQuestionCardStateParams) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const timeLeft = question.timeout || null

  const qType = question.questionType || QuestionType.SINGLE_CHOICE

  const handleOptionClick = (optionId: string) => {
    if (disabled) return

    if (qType === QuestionType.MULTIPLE_CHOICE) {
      setSelectedOptions(prev =>
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      )
      return
    }

    setSelectedOptions([optionId])
  }

  const handleSubmit = () => {
    if (disabled) return
    const additionalFeedback = freeText.trim() ? freeText.trim() : undefined

    if (qType === QuestionType.FREE_TEXT) {
      onAnswer(freeText, additionalFeedback)
      return
    }

    if (selectedOptions.length > 0) {
      onAnswer(
        qType === QuestionType.MULTIPLE_CHOICE ? selectedOptions : selectedOptions[0],
        additionalFeedback
      )
    }
  }

  const canSubmit =
    (qType === QuestionType.FREE_TEXT && freeText.trim().length > 0) || selectedOptions.length > 0

  return {
    selectedOptions,
    freeText,
    timeLeft,
    handleOptionClick,
    handleSubmit,
    setFreeText,
    canSubmit,
    qType,
  }
}
