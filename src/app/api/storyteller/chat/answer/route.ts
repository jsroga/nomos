import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  StorytellerAnswerSeparator,
  StorytellerMessageRole,
  StorytellerMessageType,
} from '@/domains/storyteller/core/storyteller-page-wire'

/**
 * POST /api/storyteller/chat/answer
 * Submit an answer to a question and continue the agent flow
 */
export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const body = await req.json()
    const { questionId, answer, freeText } = body

    if (!questionId || !answer) {
      return NextResponse.json({ error: API_ERROR.QUESTION_ANSWER_REQUIRED }, { status: 400 })
    }

    // Format the answer as a human message
    const answerText = Array.isArray(answer)
      ? `Selected: ${answer.join(StorytellerAnswerSeparator.CommaSpace)}`
      : `Selected: ${answer}`

    const fullAnswer = freeText ? `${answerText}\n\nAdditional context: ${freeText}` : answerText

    const responseData = {
      success: true,
      questionId,
      answer,
      message: {
        type: StorytellerMessageType.Human,
        content: fullAnswer,
        name: StorytellerMessageRole.User,
        sender: StorytellerMessageRole.User,
      },
      continueStream: true,
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error(API_LOG_PREFIX.ANSWER_SUBMISSION_ERROR, error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : API_ERROR.FAILED_SUBMIT_ANSWER,
      },
      { status: 500 }
    )
  }
}
