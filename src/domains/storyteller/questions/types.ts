import { AgentQuestion, QuestionOption, QuestionStatus } from '../actions/types'

export type { AgentQuestion, QuestionOption }
export { QuestionStatus }

// ============================================
// QUESTION STATE MACHINE
// ============================================

export type QuestionMachineState = 'idle' | 'awaiting_answer' | 'processing' | 'completed'

export interface QuestionSession {
  id: string
  question: AgentQuestion
  status: QuestionStatus
  machineState: QuestionMachineState
  answer?: string | string[]
  answeredAt?: Date
  createdAt: Date
}

// ============================================
// USER ANSWER
// ============================================

export interface UserAnswer {
  questionId: string
  answer: string | string[]
  freeText?: string // Additional context from user
  timestamp: Date
}

// ============================================
// QUESTION MANAGER STATE
// ============================================

export interface QuestionManagerState {
  currentQuestion: QuestionSession | null
  pendingQuestions: QuestionSession[]
  answeredQuestions: QuestionSession[]
  isBlocked: boolean // True if there's a blocking question
}

// ============================================
// EVENTS
// ============================================

export type QuestionEvent =
  | { type: 'QUESTION_RECEIVED'; question: AgentQuestion }
  | { type: 'ANSWER_SUBMITTED'; questionId: string; answer: string | string[] }
  | { type: 'QUESTION_SKIPPED'; questionId: string }
  | { type: 'QUESTION_TIMEOUT'; questionId: string }
  | { type: 'PROCESSING_COMPLETE'; questionId: string }

// ============================================
// HELPERS
// ============================================

export function createQuestionSession(question: AgentQuestion): QuestionSession {
  return {
    id: question.id,
    question,
    status: QuestionStatus.PENDING,
    machineState: 'awaiting_answer',
    createdAt: new Date(),
  }
}

export function isBlockingQuestion(question: AgentQuestion): boolean {
  return question.urgency === 'blocking'
}

export function getRecommendedOption(question: AgentQuestion): QuestionOption | undefined {
  return question.options?.find(opt => opt.recommended)
}

export function formatQuestionForMessage(session: QuestionSession): string {
  const q = session.question
  let text = `**${q.agentName} asks:** ${q.question}\n\n`

  if (q.context) {
    text += `_Context: ${q.context}_\n\n`
  }

  if (q.options) {
    text += 'Options:\n'
    q.options.forEach((opt, i) => {
      const marker = opt.recommended ? '⭐' : '○'
      text += `${marker} **${opt.label}**`
      if (opt.description) text += ` - ${opt.description}`
      if (opt.consequence) text += ` → ${opt.consequence}`
      text += '\n'
    })
  }

  return text
}
