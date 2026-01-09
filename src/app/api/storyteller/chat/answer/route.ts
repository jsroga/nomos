import { NextResponse } from 'next/server'
import { HumanMessage } from '@langchain/core/messages'

export const runtime = 'nodejs'

/**
 * POST /api/storyteller/chat/answer
 * Submit an answer to a question and continue the agent flow
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { questionId, answer, projectId, threadId, previousState, freeText } = body

    if (!questionId || !answer) {
      return NextResponse.json({ error: 'questionId and answer are required' }, { status: 400 })
    }

    // Format the answer as a human message
    const answerText = Array.isArray(answer)
      ? `Selected: ${answer.join(', ')}`
      : `Selected: ${answer}`

    const fullAnswer = freeText ? `${answerText}\n\nAdditional context: ${freeText}` : answerText

    // Create the response message
    const userMessage = new HumanMessage({
      content: fullAnswer,
      name: 'User',
    })

    // If we have previous state, we can continue from there
    // Otherwise, this is just a regular message to be processed
    const responseData = {
      success: true,
      questionId,
      answer,
      message: {
        type: 'human',
        content: fullAnswer,
        name: 'User',
        sender: 'User',
      },
      // The frontend should add this message and trigger a new stream
      continueStream: true,
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Answer submission error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit answer' },
      { status: 500 }
    )
  }
}
