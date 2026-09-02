// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { QuestionType, QuestionUrgency } from '@/domains/storyteller/core/types/enums'
import type { AgentQuestion } from '@/domains/storyteller/core/types/action-types'
import { useQuestionCardState } from '../useQuestionCardState'

const QUESTION: AgentQuestion = {
  id: 'q-1',
  agentName: 'Storyteller',
  question: 'Verdict?',
  questionType: QuestionType.SINGLE_CHOICE,
  urgency: QuestionUrgency.BLOCKING,
  options: [{ id: 'approve', label: 'Approve' }],
  timeout: 1,
  defaultOption: 'approve',
}

function Probe({ onAnswer }: { onAnswer: (answer: string | string[]) => void }) {
  useQuestionCardState({ question: QUESTION, onAnswer, disabled: false })
  useEffect(() => undefined, [])
  return null
}

describe('useQuestionCardState', () => {
  it('never auto-answers when a timeout is present', async () => {
    const onAnswer = vi.fn()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(<Probe onAnswer={onAnswer} />)
    })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1200))
    })
    expect(onAnswer).not.toHaveBeenCalled()
    await act(async () => {
      root.unmount()
    })
    host.remove()
  })
})
