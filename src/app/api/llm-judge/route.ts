import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { registerCorePrompts } from '@/shared/agent-kernel/prompts/registry'
import { ALL_SCORERS } from '@/shared/agent-kernel/scorers'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  CHAT_EVAL_FAILED_ERROR,
  LlmJudgeRole,
} from '@/shared/chat/core/constants/chat-interface'

interface ConversationMessage {
  role: LlmJudgeRole
  content: string
  agentName?: string
}

interface EvaluationRequest {
  conversation: ConversationMessage[]
  projectId?: string
}

interface CriteriaScore {
  score: number
  comment: string
}

interface EvaluationResult {
  score: number
  feedback: string
  criteria: Record<string, CriteriaScore>
  runId: string
}

export const POST = withAuth(async (request: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const body: EvaluationRequest = await request.json()
    const { conversation } = body

    if (!conversation || conversation.length === 0) {
      return NextResponse.json({ error: API_ERROR.NO_CONVERSATION_PROVIDED }, { status: 400 })
    }

    const lastAssistantMessage = [...conversation]
      .reverse()
      .find((m) => m.role === LlmJudgeRole.Assistant)
    if (!lastAssistantMessage) {
      return NextResponse.json({ error: API_ERROR.NO_ASSISTANT_RESPONSE }, { status: 400 })
    }

    const runId = uuidv4()
    registerCorePrompts()

    const userMessages = conversation
      .filter((m) => m.role === LlmJudgeRole.User)
      .map((m) => m.content)
    const input = {
      message: userMessages.join('\n'),
      persona: conversation.find((m) => m.agentName)?.agentName,
    }

    const criteria: Record<string, CriteriaScore> = {}
    const scores: number[] = []

    for (const scorer of ALL_SCORERS) {
      try {
        const result = await scorer.run({
          input,
          output: lastAssistantMessage.content,
        })
        const pct = Math.round(result.score * 100)
        criteria[scorer.id] = {
          score: pct,
          comment: result.reason ?? '',
        }
        scores.push(result.score)
      } catch (error) {
        criteria[scorer.id] = { score: 0, comment: String(error) }
      }
    }

    const overallScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 10
        : 0

    const result: EvaluationResult = {
      score: overallScore,
      feedback: `Evaluated with ${ALL_SCORERS.length} Mastra scorers (magic, consistency, hallucination, persona fidelity).`,
      criteria,
      runId,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(API_LOG_PREFIX.EVALUATION_ERROR, error)
    return NextResponse.json({ error: CHAT_EVAL_FAILED_ERROR }, { status: 500 })
  }
})
