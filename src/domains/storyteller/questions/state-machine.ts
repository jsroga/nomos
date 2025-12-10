import { v4 as uuidv4 } from 'uuid'
import {
  AgentQuestion,
  QuestionSession,
  QuestionManagerState,
  QuestionEvent,
  createQuestionSession,
  isBlockingQuestion,
  UserAnswer,
} from './types'

// ============================================
// QUESTION MANAGER - Handles question flow
// ============================================

export class QuestionManager {
  private state: QuestionManagerState = {
    currentQuestion: null,
    pendingQuestions: [],
    answeredQuestions: [],
    isBlocked: false,
  }

  private listeners: Set<(state: QuestionManagerState) => void> = new Set()

  /**
   * Get current state
   */
  getState(): QuestionManagerState {
    return { ...this.state }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: QuestionManagerState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Process an event
   */
  dispatch(event: QuestionEvent): void {
    switch (event.type) {
      case 'QUESTION_RECEIVED':
        this.handleQuestionReceived(event.question)
        break
      case 'ANSWER_SUBMITTED':
        this.handleAnswerSubmitted(event.questionId, event.answer)
        break
      case 'QUESTION_SKIPPED':
        this.handleQuestionSkipped(event.questionId)
        break
      case 'QUESTION_TIMEOUT':
        this.handleQuestionTimeout(event.questionId)
        break
      case 'PROCESSING_COMPLETE':
        this.handleProcessingComplete(event.questionId)
        break
    }
    this.notifyListeners()
  }

  /**
   * Add a new question
   */
  addQuestion(question: AgentQuestion): void {
    this.dispatch({ type: 'QUESTION_RECEIVED', question })
  }

  /**
   * Submit an answer
   */
  submitAnswer(questionId: string, answer: string | string[]): UserAnswer {
    this.dispatch({ type: 'ANSWER_SUBMITTED', questionId, answer })
    return {
      questionId,
      answer,
      timestamp: new Date(),
    }
  }

  /**
   * Skip a question (only for non-blocking)
   */
  skipQuestion(questionId: string): boolean {
    const session = this.findQuestion(questionId)
    if (session && session.question.urgency !== 'blocking') {
      this.dispatch({ type: 'QUESTION_SKIPPED', questionId })
      return true
    }
    return false
  }

  /**
   * Check if we're waiting for user input
   */
  isAwaitingInput(): boolean {
    return this.state.isBlocked || this.state.currentQuestion !== null
  }

  /**
   * Get the current blocking question (if any)
   */
  getBlockingQuestion(): QuestionSession | null {
    if (this.state.currentQuestion?.question.urgency === 'blocking') {
      return this.state.currentQuestion
    }
    return this.state.pendingQuestions.find(q => q.question.urgency === 'blocking') || null
  }

  /**
   * Clear all pending questions
   */
  clearPending(): void {
    this.state.pendingQuestions.forEach(q => {
      q.status = 'skipped'
      q.machineState = 'completed'
    })
    this.state.answeredQuestions.push(...this.state.pendingQuestions)
    this.state.pendingQuestions = []
    this.state.currentQuestion = null
    this.state.isBlocked = false
    this.notifyListeners()
  }

  // ============================================
  // Private handlers
  // ============================================

  private handleQuestionReceived(question: AgentQuestion): void {
    const session = createQuestionSession(question)

    if (isBlockingQuestion(question)) {
      // Blocking questions go to front
      if (!this.state.currentQuestion) {
        this.state.currentQuestion = session
      } else {
        this.state.pendingQuestions.unshift(session)
      }
      this.state.isBlocked = true
    } else {
      // Non-blocking questions queue up
      if (!this.state.currentQuestion) {
        this.state.currentQuestion = session
      } else {
        this.state.pendingQuestions.push(session)
      }
    }
  }

  private handleAnswerSubmitted(questionId: string, answer: string | string[]): void {
    const session = this.findQuestion(questionId)
    if (!session) return

    session.status = 'answered'
    session.machineState = 'processing'
    session.answer = answer
    session.answeredAt = new Date()

    // Move to answered
    this.moveToAnswered(questionId)

    // Process next question
    this.promoteNextQuestion()
  }

  private handleQuestionSkipped(questionId: string): void {
    const session = this.findQuestion(questionId)
    if (!session) return

    session.status = 'skipped'
    session.machineState = 'completed'

    this.moveToAnswered(questionId)
    this.promoteNextQuestion()
  }

  private handleQuestionTimeout(questionId: string): void {
    const session = this.findQuestion(questionId)
    if (!session) return

    // Use default option if available
    const defaultOpt = session.question.defaultOption
    if (defaultOpt) {
      session.status = 'answered'
      session.answer = defaultOpt
    } else {
      session.status = 'timeout'
    }
    session.machineState = 'completed'
    session.answeredAt = new Date()

    this.moveToAnswered(questionId)
    this.promoteNextQuestion()
  }

  private handleProcessingComplete(questionId: string): void {
    const session = this.state.answeredQuestions.find(q => q.id === questionId)
    if (session) {
      session.machineState = 'completed'
    }
  }

  // ============================================
  // Helpers
  // ============================================

  private findQuestion(questionId: string): QuestionSession | undefined {
    if (this.state.currentQuestion?.id === questionId) {
      return this.state.currentQuestion
    }
    return this.state.pendingQuestions.find(q => q.id === questionId)
  }

  private moveToAnswered(questionId: string): void {
    if (this.state.currentQuestion?.id === questionId) {
      this.state.answeredQuestions.push(this.state.currentQuestion)
      this.state.currentQuestion = null
    } else {
      const idx = this.state.pendingQuestions.findIndex(q => q.id === questionId)
      if (idx >= 0) {
        const [removed] = this.state.pendingQuestions.splice(idx, 1)
        this.state.answeredQuestions.push(removed)
      }
    }
  }

  private promoteNextQuestion(): void {
    if (!this.state.currentQuestion && this.state.pendingQuestions.length > 0) {
      this.state.currentQuestion = this.state.pendingQuestions.shift()!
    }

    // Update blocked status
    this.state.isBlocked =
      this.state.currentQuestion?.question.urgency === 'blocking' ||
      this.state.pendingQuestions.some(q => q.question.urgency === 'blocking')
  }

  private notifyListeners(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }
}

// Singleton instance
export const questionManager = new QuestionManager()
