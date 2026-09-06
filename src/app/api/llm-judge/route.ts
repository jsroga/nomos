import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { withGatewayContext } from '@/shared/ai/gateway/call-context'
import { isE2eHarnessCaller } from '@/shared/ai/gateway/e2e-llm-pin'
import { E2eLlmPinError } from '@/shared/ai/gateway/constants/e2e-llm-pin'
import { registerCorePrompts } from '@/shared/agent-kernel/prompts/registry'
import { ALL_SCORERS } from '@/shared/agent-kernel/scorers'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpHeader, HttpStatus, QueryParam } from '@/shared/data/constants/protocol'
import { recordFromJson, readString, recordArrayFromJson } from '@/shared/data/json-guards'
import {
  CHAT_EVAL_FAILED_ERROR,
  LlmJudgeRole,
} from '@/shared/chat/core/constants/chat-interface'

interface ConversationMessage {
  role: LlmJudgeRole
  content: string
  agentName?: string
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

function isLlmJudgeRole(value: string): value is LlmJudgeRole {
  return value === LlmJudgeRole.User || value === LlmJudgeRole.Assistant
}

function conversationFromUnknown(value: unknown): ConversationMessage[] {
  return recordArrayFromJson(value).flatMap((row) => {
    const role = readString(row.role)
    const content = readString(row.content)
    if (!role || !content || !isLlmJudgeRole(role)) return []
    const agentName = readString(row.agentName)
    if (agentName) {
      return [{ role, content, agentName }]
    }
    return [{ role, content }]
  })
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }

    if (
      isE2eHarnessCaller({
        userId: session.user.id,
        email: session.user.email,
        bypassHeader: request.headers.get(HttpHeader.BYPASS_AUTH),
      })
    ) {
      return NextResponse.json(
        { error: E2eLlmPinError.JudgingForbidden },
        { status: HttpStatus.NOT_FOUND }
      )
    }

    const body = recordFromJson(await request.json())
    const projectId = readString(body[QueryParam.ProjectId])
    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
    }

    const scope = await tryProjectScope(projectId, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: HttpStatus.NOT_FOUND })
    }

    const conversation = conversationFromUnknown(body.conversation)
    if (conversation.length === 0) {
      return NextResponse.json({ error: API_ERROR.NO_CONVERSATION_PROVIDED }, { status: HttpStatus.BAD_REQUEST })
    }

    const lastAssistantMessage = [...conversation]
      .reverse()
      .find((m) => m.role === LlmJudgeRole.Assistant)
    if (!lastAssistantMessage) {
      return NextResponse.json({ error: API_ERROR.NO_ASSISTANT_RESPONSE }, { status: HttpStatus.BAD_REQUEST })
    }

    return await withGatewayContext({ scope }, async () => {
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
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.EVALUATION_ERROR, error)
    return NextResponse.json({ error: CHAT_EVAL_FAILED_ERROR }, { status: HttpStatus.INTERNAL })
  }
}
