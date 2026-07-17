import { useEffect, useState } from 'react'
import { AgentQuestion } from '@/domains/storyteller/core/types/action-types'
import { QuestionType } from '@/domains/storyteller/core/types/enums'

interface UseQuestionCardStateParams {
  question: AgentQuestion
  onAnswer: (answer: string | string[]) => void
  disabled: boolean
}

export const useQuestionCardState = ({
  question,
  onAnswer,
  disabled,
}: UseQuestionCardStateParams) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const [timeLeft, setTimeLeft] = useState<number | null>(question.timeout || null)

  useEffect(() => {
    if (!question.timeout || disabled) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval)
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

    if (qType === QuestionType.FREE_TEXT) {
      onAnswer(freeText)
      return
    }

    if (selectedOptions.length > 0) {
      onAnswer(qType === QuestionType.MULTIPLE_CHOICE ? selectedOptions : selectedOptions[0])
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
