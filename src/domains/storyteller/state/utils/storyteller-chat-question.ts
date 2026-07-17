import type { QuestionSession as ChatQuestionSession } from '@/shared/chat/core/types'
import { QuestionUrgency as ChatQuestionUrgency, QuestionSessionStatus } from '@/shared/chat/core/constants/chat-messages'
import {
  QuestionMachineState,
  QuestionStatus,
  QuestionType,
  QuestionUrgency,
  type AgentQuestion,
  type QuestionSession,
} from '@/domains/storyteller/core/types/action-types'
import { StorytellerMessageRole } from '@/domains/storyteller/state/constants/storyteller-chat'

function mapChatAgentQuestion(question: ChatQuestionSession['question']): AgentQuestion {
  return {
    id: question.id,
    agentName: StorytellerMessageRole.Showrunner,
    question: question.question,
    questionType: question.options?.length ? QuestionType.SINGLE_CHOICE : QuestionType.FREE_TEXT,
    urgency:
      question.urgency === ChatQuestionUrgency.Blocking
        ? QuestionUrgency.BLOCKING
        : QuestionUrgency.OPTIONAL,
    options: question.options?.map((label, index) => ({
      id: String(index),
      label,
    })),
    context: question.context,
  }
}

function mapChatQuestionStatus(status: ChatQuestionSession['status']): QuestionStatus {
  if (status === QuestionSessionStatus.Answered) return QuestionStatus.ANSWERED
  if (status === QuestionSessionStatus.Skipped) return QuestionStatus.SKIPPED
  return QuestionStatus.PENDING
}

export function chatQuestionSessionToStoryteller(session: ChatQuestionSession): QuestionSession {
  return {
    id: session.id,
    question: mapChatAgentQuestion(session.question),
    status: mapChatQuestionStatus(session.status),
    machineState: QuestionMachineState.AWAITING_ANSWER,
    answer: session.answer,
    createdAt: new Date(),
  }
}

export function appendUniqueQuestionSession(
  prev: QuestionSession[],
  session: ChatQuestionSession
): QuestionSession[] {
  const existingQuestionTexts = new Set(
    prev.map(p => p.question.question.toLowerCase().trim())
  )
  const incomingText = session.question.question.toLowerCase().trim()
  if (existingQuestionTexts.has(incomingText)) return prev
  return [...prev, chatQuestionSessionToStoryteller(session)]
}
